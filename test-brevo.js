const { BrevoClient } = require('@getbrevo/brevo');
console.log(Object.keys(new BrevoClient({ apiKey: 'test' })));
