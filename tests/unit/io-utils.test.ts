import fs from 'fs';
import os from 'os';
import path from 'path';

const sendMail = jest.fn();
jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport: jest.fn(() => ({ sendMail })) } }));
import nodemailer from 'nodemailer';
import { MailerUtil } from '../../src/utils/mailer.util';
import { ErrorUtils } from '../../src/utils/error.util';
import { FileUtil } from '../../src/utils/file.util';

describe('MailerUtil', () => {
  let log: jest.SpyInstance; let err: jest.SpyInstance;
  beforeEach(() => {
    sendMail.mockReset();
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => { log.mockRestore(); err.mockRestore(); });

  it('active secure seulement sur le port 465', () => {
    new MailerUtil('smtp', 465, 'u', 'p');
    new MailerUtil('smtp', 587, 'u', 'p');
    const calls = (nodemailer.createTransport as jest.Mock).mock.calls;
    expect(calls[0][0]).toMatchObject({ host: 'smtp', port: 465, secure: true, auth: { user: 'u', pass: 'p' } });
    expect(calls[1][0].secure).toBe(false);
  });

  it('envoie le mail et journalise une erreur sans la propager', async () => {
    const mailer = new MailerUtil('smtp', 587, 'u', 'p');
    sendMail.mockResolvedValueOnce({ messageId: 'id1' });
    await mailer.sendMail({ from: 'a', to: 'b', subject: 's' });
    expect(log).toHaveBeenCalledWith('Email sent: %s', 'id1');
    sendMail.mockRejectedValueOnce(new Error('smtp down'));
    await expect(mailer.sendMail({ from: 'a', to: 'b', subject: 's' })).resolves.toBeUndefined();
    expect(err).toHaveBeenCalled();
  });
});

describe('ErrorUtils', () => {
  const error = new Error('boom');

  it('formatError', () => {
    expect(ErrorUtils.formatError(error)).toMatch(/^Error: Error\nMessage: boom\nStack: /);
  });

  it('logErrorToFile écrit puis rejette en cas d’erreur fs', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'err-'));
    const file = path.join(dir, 'e.log');
    await ErrorUtils.logErrorToFile(error, file);
    expect(fs.readFileSync(file, 'utf-8')).toContain('Message: boom');
    await expect(ErrorUtils.logErrorToFile(error, path.join(dir, 'missing', 'e.log'))).rejects.toThrow();
  });

  it('notifyErrorByEmail envoie le détail de l’erreur', async () => {
    const spy = jest.spyOn(MailerUtil.prototype, 'sendMail').mockResolvedValue(undefined);
    await ErrorUtils.notifyErrorByEmail(error, 'to@x', 'from@x', 'smtp', 'u', 'p');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ to: 'to@x', from: 'from@x', subject: 'Error Notification: Error' }));
    spy.mockRestore();
  });

  it('createCustomError et parseErrorFromJSON', () => {
    const custom = ErrorUtils.createCustomError('m', 42, { a: 1 });
    expect(custom).toMatchObject({ name: 'CustomError', message: 'm', errorCode: 42, metadata: { a: 1 } });
    expect(ErrorUtils.parseErrorFromJSON('{"message":"x","errorCode":0}')).toMatchObject({ name: 'CustomError', errorCode: 0 });
    expect(ErrorUtils.parseErrorFromJSON('{"message":"plain"}').message).toBe('plain');
    expect(ErrorUtils.parseErrorFromJSON('{}').message).toBe('Unknown error');
    expect(ErrorUtils.parseErrorFromJSON('not json').message).toBe('Invalid JSON string');
  });
});

describe('FileUtil', () => {
  let dir: string;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-')); });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('écrit, lit, teste et supprime un fichier', async () => {
    const f = new FileUtil(path.join(dir, 'a.txt'));
    expect(await f.fileExists()).toBe(false);
    await f.writeFile('hello');
    expect(await f.readFile()).toBe('hello');
    expect(await f.fileExists()).toBe(true);
    await f.deleteFile();
    expect(await f.fileExists()).toBe(false);
  });

  it('rejette les erreurs fs', async () => {
    const missing = new FileUtil(path.join(dir, 'nope', 'x.txt'));
    await expect(missing.readFile()).rejects.toThrow();
    await expect(missing.writeFile('x')).rejects.toThrow();
    await expect(missing.deleteFile()).rejects.toThrow();
    await expect(FileUtil.readDirectory(path.join(dir, 'nope'))).rejects.toThrow();
    await expect(FileUtil.copyFile(path.join(dir, 'nope'), path.join(dir, 'b'))).rejects.toThrow();
    await expect(FileUtil.moveFile(path.join(dir, 'nope'), path.join(dir, 'b'))).rejects.toThrow();
    fs.writeFileSync(path.join(dir, 'file'), '');
    await expect(FileUtil.createDirectory(path.join(dir, 'file', 'sub'))).rejects.toThrow();
  });

  it('gère dossiers, copie, déplacement et lecture récursive', async () => {
    await FileUtil.createDirectory(path.join(dir, 'sub', 'deep'));
    fs.writeFileSync(path.join(dir, 'root.txt'), 'r');
    await FileUtil.copyFile(path.join(dir, 'root.txt'), path.join(dir, 'sub', 'copy.txt'));
    await FileUtil.moveFile(path.join(dir, 'sub', 'copy.txt'), path.join(dir, 'sub', 'deep', 'moved.txt'));
    expect((await FileUtil.readDirectory(dir)).sort()).toEqual(['root.txt', 'sub']);
    const tree = await FileUtil.readDirectoryAndSubDirectory(dir);
    expect(tree).toEqual({
      files: [path.join(dir, 'root.txt')],
      sub: { deep: { files: [path.join(dir, 'sub', 'deep', 'moved.txt')] } },
    });
  });

  it('readDirectoryAndSubDirectory journalise un dossier illisible', async () => {
    const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await FileUtil.readDirectoryAndSubDirectory(path.join(dir, 'nope'))).toEqual({});
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});
