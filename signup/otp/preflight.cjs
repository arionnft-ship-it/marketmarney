'use strict';
// Pre-deploy sender validation. Only Resend's documented synthetic recipient is used.
const {createMailer}=require('./mailer.cjs');
async function preflight(env=process.env,mailer=createMailer(env)){
 if(env.MM_SIGNUP_EMAIL_OTP!=='required')return {required:false,skipped:true};
 if(!mailer.ready)throw Error('Resend API key or sender address is missing/invalid');
 if(!/^[a-f0-9]{64}$/i.test(env.MM_OTP_SECRET||'')&&env.MM_OTP_SECRET_FILE!=='/persist/.marketmarney-private/signup-otp.secret')throw Error('Private OTP key storage is not configured');
 const id=String(env.RAILWAY_DEPLOYMENT_ID||'manual-r2').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,100);
 await mailer.send({email:'delivered+marketmarney-otp-setup@resend.dev',code:'000000',idempotencyKey:'marney-otp-preflight/'+id});
 return {required:true,providerAccepted:true,sender:env.MM_EMAIL_FROM,testRecipient:'Resend synthetic delivery address',realUserEmailSent:false,accountCreated:false};
}
if(require.main===module)preflight().then(result=>console.log('MM_OTP_SENDER_PREFLIGHT '+JSON.stringify(result))).catch(()=>{console.error('MM_OTP_SENDER_PREFLIGHT_FAILED: verify RESEND_API_KEY, verified sender, and OTP key storage. No secret values logged.');process.exitCode=1;});
module.exports={preflight};
