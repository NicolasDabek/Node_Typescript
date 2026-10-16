describe('logger.util', () => {
  afterEach(() => jest.resetModules());

  it('crée le dossier de logs s’il manque', () => {
    jest.isolateModules(() => {
      jest.doMock('winston-daily-rotate-file', () => jest.fn().mockImplementation(() => new (require('winston').transports.Stream)({ stream: new (require('stream').Writable)({ write: (_c: any, _e: any, cb: any) => cb() }) })));
      const fs = require('fs');
      const exists = jest.spyOn(fs, 'existsSync').mockReturnValueOnce(false);
      const mkdir = jest.spyOn(fs, 'mkdirSync').mockImplementationOnce(() => undefined);
      require('../../src/utils/logger.util');
      expect(mkdir).toHaveBeenCalledWith(expect.stringMatching(/logs$/));
      exists.mockRestore(); mkdir.mockRestore();
    });
  });

  it('stream retire le saut de ligne final de morgan sans tronquer le reste', () => {
    jest.isolateModules(() => {
      const { logger, stream } = require('../../src/utils/logger.util');
      const info = jest.spyOn(logger, 'info').mockImplementation(() => logger);
      stream.write('GET / 200\n');
      stream.write('sans saut de ligne');
      expect(info).toHaveBeenNthCalledWith(1, 'GET / 200');
      expect(info).toHaveBeenNthCalledWith(2, 'sans saut de ligne');
    });
  });
});
