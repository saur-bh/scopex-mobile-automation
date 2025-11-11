const fetch = require('node-fetch');

async function getEmailAndOtp() {
  const timestamp = Date.now();
  const email = `test-user-${timestamp}@test.com`;
  const password = 'test-user-password';

  const domainRes = await fetch('https://api.mail.tm/domains');
  const domain = (await domainRes.json())['hydra:member'][0].domain;
  const tempEmail = email.replace('@test.com', `@${domain}`);

  await fetch('https://api.mail.tm/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: tempEmail, password })
  }).catch(() => {});

  const tokenRes = await fetch('https://api.mail.tm/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: tempEmail, password })
  });
  const { token } = await tokenRes.json();

  await fetch('https://v2.scopex.dev/users/auth/register-email/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: tempEmail })
  });

  for (let i = 0; i < 10; i++) {
    const inboxRes = await fetch('https://api.mail.tm/messages', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const inbox = await inboxRes.json();
    const messages = inbox['hydra:member'];

    const otpEmail = messages.find(m => m.subject === 'OTP Verification');
    if (otpEmail) {
      const msgRes = await fetch(`https://api.mail.tm/messages/${otpEmail.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const msg = await msgRes.json();
      const match = msg.intro.match(/\d+$/);
      return { email: tempEmail, otp: match ? match[0] : '' };
    }

    await new Promise(res => setTimeout(res, 3000));
  }

  throw new Error('OTP not received');
}

getEmailAndOtp().then(({ email, otp }) => {
  console.log(`TEMP_EMAIL=${email}`);
  console.log(`TEMP_OTP=${otp}`);
});