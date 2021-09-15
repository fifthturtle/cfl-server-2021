const _ = require('lodash');
const mongo = require('./cflmongo');
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');
const fs = require('fs-extra');

const data = JSON.parse(fs.readFileSync('./lib/data.json'));
const transporter = nodemailer.createTransport(data.email);

async function resetPassword(owner) {
    const key = randomstring.generate({
        length: 24,
        charset: 'alphanumeric'
    });
    const query = { owner_id: owner.owner_id };
    const set = { reset: { key, expires: new Date().getTime() + (24*60*60*1000) }};
    await mongo.update('owners', { query, set });
    const html = [];
    html.push(`<p>${owner.firstname},</p>`);
    html.push(`<p>You have requested a new password.Follow this <a href="http://cactusfantasy.com/password-reset/${key}" target="_blank">Password Reset Link</a> to reset your password.</p>`);
    html.push('<p>This link will be good for 24 hours</p>')
    html.push('<p>Thank you,</p><p>CFL Admin Team</p>');
    const msgInfo = {
        from: '"CFL Admin" <cactusfantasy@cactusfantasy.com>', // sender address
        to: `"${owner.firstname} ${owner.lastname}" <${owner.alt_email}>`, // list of receivers
        subject: "Password Reset", // Subject line
        html: html.join("")
    };
    console.log('msg info', msgInfo);
    return transporter.sendMail(msgInfo)
        .then(info => {
            return info;
        })
        .catch(async err => {
            console.log('looks like there was an error', err);
            return await resetPassword(owner);
        });
}

module.exports = {
    async sendMail() {
       let info = await transporter.sendMail({
            from: '"CFL Admin" <cactusfantasy@cactusfantasy.com>', // sender address
            to: "jdefamio@gmail.com", // list of receivers
            subject: "Hello ✔", // Subject line
            text: "Hello world?", // plain text body
            html: "<b>Hello world?</b>", // html body
        });
        console.log("Message sent: %s", info.messageId);
    },
    resetPassword,
}
