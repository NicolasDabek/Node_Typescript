import nodemailer from 'nodemailer';

// Créez un transporteur pour envoyer l'e-mail
let transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: 'your-email@example.com', // remplacez par votre adresse email
    pass: 'your-password' // remplacez par votre mot de passe
  }
});

// Définissez les options de l'e-mail
let mailOptions = (from?, to?, subject?, text?, html?) => {
  return { from, to, subject, text, html }
}

// Envoyez l'e-mail
transporter.sendMail(mailOptions(), (error, info) => {
  if (error) {
    console.log(error);
  } else {
    console.log(`Email sent: ${info.response}`);
  }
})