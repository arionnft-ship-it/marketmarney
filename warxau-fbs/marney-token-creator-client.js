import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import {
 MINT_SIZE,TOKEN_PROGRAM_ID,AuthorityType,
 createInitializeMintInstruction,
 getAssociatedTokenAddressSync,
 createAssociatedTokenAccountInstruction,
 createMintToInstruction,
 createSetAuthorityInstruction,
 getMint
} from '@solana/spl-token';

const ENDPOINT='https://api.devnet.solana.com';
const conn=new Connection(ENDPOINT,'confirmed');
const $=id=>document.getElementById(id);
const state={wallet:null,payer:null,busy:false,mint:null,signature:null};
const formatAddress=v=>v?String(v).slice(0,5)+'…'+String(v).slice(-5):'—';
function status(message,type='info'){
 const node=$('status');node.textContent=message;node.dataset.kind=type;
}
function setBusy(value){state.busy=value;for(const b of document.querySelectorAll('button'))b.disabled=value;}
function provider(){const p=window.phantom?.solana||window.solana;return p?.isPhantom?p:null;}
function amountBaseUnits(supply,decimals){
 const raw=String(supply).trim();
 if(!/^[1-9]\d{0,11}$/.test(raw))throw new Error('Total suplai harus bilangan bulat 1 sampai 999.999.999.999.');
 const v=BigInt(raw)*10n**BigInt(decimals);
 if(v>18446744073709551615n)throw new Error('Suplai terlalu besar untuk SPL Token. Kurangi suplai atau desimal.');
 return v;
}
function readForm(){
 const name=$('name').value.trim(),symbol=$('symbol').value.trim().toUpperCase();
 const decimals=Number($('decimals').value);
 if(name.length<3||name.length>32)throw new Error('Nama token harus 3–32 karakter.');
 if(!/^[A-Z0-9]{2,10}$/.test(symbol))throw new Error('Simbol harus 2–10 huruf kapital atau angka.');
 if(!Number.isInteger(decimals)||decimals<0||decimals>9)throw new Error('Desimal harus antara 0 sampai 9.');
 const amount=amountBaseUnits($('supply').value,decimals);
 return {name,symbol,decimals,supply:$('supply').value,amount,fixed:$('fixed').checked};
}
function renderPreview(){
 try{const v=readForm();$('previewName').textContent=v.name;$('previewSymbol').textContent=v.symbol;$('previewSupply').textContent=Number(v.supply).toLocaleString('id-ID');$('previewDecimals').textContent=String(v.decimals);}
 catch{$('previewName').textContent=$('name').value.trim()||'Nama Token';$('previewSymbol').textContent=$('symbol').value.toUpperCase()||'TOKEN';$('previewSupply').textContent=$('supply').value||'—';}
}
async function connect(){
 if(state.busy)return;
 const p=provider();
 if(!p){status('Phantom tidak ditemukan. Pasang ekstensi Phantom atau buka website melalui browser Phantom.', 'error');return}
 try{
  const result=await p.connect();
  const key=result?.publicKey||p.publicKey;
  if(!key)throw new Error('Phantom tidak memberikan alamat wallet.');
  state.wallet=p;state.payer=new PublicKey(key.toString());
  $('walletAddress').textContent=state.payer.toBase58();
  $('connect').textContent='Wallet terhubung';
  $('connect').dataset.connected='true';
  status('Wallet berhasil dihubungkan. Gunakan hanya SOL Devnet untuk mencoba membuat token.','success');
  const balance=await conn.getBalance(state.payer,'confirmed');
  $('balance').textContent=(balance/1e9).toFixed(4)+' SOL (Devnet)';
 }catch(err){status('Koneksi Phantom gagal: '+String(err.message||err),'error');}
}
async function airdrop(){
 if(state.busy)return;
 if(!state.payer){status('Hubungkan Phantom terlebih dahulu.','error');return}
 setBusy(true);
 try{
  status('Meminta SOL Devnet dari faucet…');
  const signature=await conn.requestAirdrop(state.payer,1e9);
  const bh=await conn.getLatestBlockhash('confirmed');
  await conn.confirmTransaction({signature,blockhash:bh.blockhash,lastValidBlockHeight:bh.lastValidBlockHeight},'confirmed');
  const balance=await conn.getBalance(state.payer,'confirmed');
  $('balance').textContent=(balance/1e9).toFixed(4)+' SOL (Devnet)';
  status('Faucet Devnet berhasil. Token uji tidak mempunyai nilai uang.','success');
 }catch(e){status('Faucet sedang dibatasi atau gagal: '+String(e.message||e)+'. Coba faucet.solana.com.','error');}
 finally{setBusy(false);}
}
function instructionPlan(payer,mint,form,rent){
 const ata=getAssociatedTokenAddressSync(mint.publicKey,payer,false,TOKEN_PROGRAM_ID);
 const instructions=[
  SystemProgram.createAccount({fromPubkey:payer,newAccountPubkey:mint.publicKey,space:MINT_SIZE,lamports:rent,programId:TOKEN_PROGRAM_ID}),
  createInitializeMintInstruction(mint.publicKey,form.decimals,payer,null,TOKEN_PROGRAM_ID),
  createAssociatedTokenAccountInstruction(payer,ata,payer,mint.publicKey,TOKEN_PROGRAM_ID),
  createMintToInstruction(mint.publicKey,ata,payer,form.amount,[],TOKEN_PROGRAM_ID)
 ];
 if(form.fixed)instructions.push(createSetAuthorityInstruction(mint.publicKey,payer,AuthorityType.MintTokens,null,[],TOKEN_PROGRAM_ID));
 return {ata,instructions};
}
async function createToken(){
 if(state.busy)return;
 if(!state.payer||!state.wallet){status('Hubungkan Phantom terlebih dahulu.','error');return}
 let form;
 try{form=readForm()}catch(e){status(e.message,'error');return}
 if(!$('ack').checked){status('Centang persetujuan bahwa ini hanya Devnet dan nama/simbol belum disimpan on-chain.','error');return}
 if(typeof state.wallet.signTransaction!=='function'){status('Phantom versi ini tidak mendukung signTransaction. Perbarui ekstensi atau gunakan browser Phantom.','error');return}
 setBusy(true);
 let signature=null,mint=null;
 try{
  status('Menghitung kebutuhan SOL Devnet dan menyiapkan instruksi…');
  mint=Keypair.generate();
  const rent=await conn.getMinimumBalanceForRentExemption(MINT_SIZE,'confirmed');
  const plan=instructionPlan(state.payer,mint,form,rent);
  const {blockhash,lastValidBlockHeight}=await conn.getLatestBlockhash('confirmed');
  const tx=new Transaction({feePayer:state.payer,recentBlockhash:blockhash}).add(...plan.instructions);
  const fee=await conn.getFeeForMessage(tx.compileMessage(),'confirmed');
  const walletBalance=await conn.getBalance(state.payer,'confirmed');
  const estimate=rent+2039280+(fee.value||5000);
  if(walletBalance<estimate){throw new Error('Saldo SOL Devnet belum cukup. Dibutuhkan sekitar '+(estimate/1e9).toFixed(5)+' SOL untuk mint, akun penerima, dan biaya jaringan.')}
  $('estimate').textContent='Perkiraan minimum '+(estimate/1e9).toFixed(5)+' SOL Devnet (biaya dapat berubah).';
  tx.partialSign(mint);
  status('Periksa transaksi di Phantom. Mint account baru, akun token dan suplai akan dibuat dalam satu transaksi.');
  const signed=await state.wallet.signTransaction(tx);
  status('Mengirim transaksi yang sudah ditandatangani ke Solana Devnet…');
  signature=await conn.sendRawTransaction(signed.serialize(),{skipPreflight:false,maxRetries:3});
  state.signature=signature;state.mint=mint.publicKey.toBase58();
  $('mint').textContent=state.mint;
  $('signature').textContent=signature;
  $('mintLink').href='https://explorer.solana.com/address/'+state.mint+'?cluster=devnet';
  $('txLink').href='https://explorer.solana.com/tx/'+signature+'?cluster=devnet';
  $('result').hidden=false;
  status('Transaksi terkirim. Menunggu konfirmasi Devnet…');
  const confirm=await conn.confirmTransaction({signature,blockhash,lastValidBlockHeight},'confirmed');
  if(confirm.value.err)throw new Error('Transaksi ditolak saat konfirmasi: '+JSON.stringify(confirm.value.err));
  const mintInfo=await getMint(conn,mint.publicKey,'confirmed',TOKEN_PROGRAM_ID);
  status('Berhasil! SPL Token dibuat di Devnet. Supply: '+mintInfo.supply.toString()+' unit dasar. Simpan alamat mint di bawah.','success');
  $('finalStatus').textContent='Terbit di Solana Devnet';
  const balance=await conn.getBalance(state.payer,'confirmed');
  $('balance').textContent=(balance/1e9).toFixed(4)+' SOL (Devnet)';
 }catch(e){
  status('Pembuatan belum terkonfirmasi: '+String(e.message||e)+(signature?' Cek transaksi melalui tautan Explorer di bawah.':''),'error');
 }finally{setBusy(false);}
}
$('connect').addEventListener('click',connect);
$('airdrop').addEventListener('click',airdrop);
$('create').addEventListener('click',createToken);
for(const id of ['name','symbol','supply','decimals'])$(id).addEventListener('input',renderPreview);
$('copyMint').addEventListener('click',async()=>{if(state.mint){try{await navigator.clipboard.writeText(state.mint);status('Alamat mint disalin.','success')}catch{status('Pilih alamat mint untuk menyalinnya.')}}});
renderPreview();
status('Mode aman: hanya Devnet. Hubungkan Phantom untuk memulai.');