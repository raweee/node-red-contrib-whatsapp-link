module.exports = function(RED) {
    const { Client, LocalAuth } = require('whatsapp-web.js');
    const QRCode = require('qrcode');
    const OS = require('os');
    const Path = require('path');

        let userDir = OS.homedir();
        let whatsappLinkDir = Path.join(userDir, '.node-red', 'Whatsapp-Link');
        function RemoteClientNode(n) {
        RED.nodes.createNode(this,n);
        let WAnode = this;
        let whatsappConnectionStatus;

        const client = new Client({
            authStrategy : new LocalAuth({
                dataPath : whatsappLinkDir
            }),
            puppeteer : {
                headless : true,
                args : ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });
        
        let WAConnect = function(){
            try {
                client.initialize();
                WAnode.log("Status : Initializing Whatsapp..");
            }
            catch(e) {
                WAnode.log(`Error : Unable to start Whatsapp. Try Again..`);
            };

            //QR-Code on Terminal and Ready Status. 
            client.on("qr", (qr)=>{
                clearInterval(connectionSetupID);
                QRCode.toString(qr, {type : 'terminal', small:true }, function(err, QRTerminal){
                    WAnode.log(`To Connect, Scan the QR Code through your Whatsapp Mobile App.`)
                    console.log("");
                    console.log(QRTerminal);
                });
            });
            client.on("ready", ()=>{
                WAnode.log(`Status : Whatsapp Connected`);
            });
        };
        WAConnect();

        //Whatsapp-Link Test Features (For Status and Testing Only.)
        client.on('message_create', async (msg)=> {
            if (msg.body.startsWith('!nodered')){
                let chat = await msg.getChat();
                let contact = await msg.getContact();
                if (chat.isGroup){
                    let msgReply = 
`Hi From Node-Red.
------------------
Group Name   : ${chat.name},
Group Id     : ${chat.id.user},
Group Admin  : ${chat.groupMetadata.owner.user},
Participants : ${chat.groupMetadata.size}`
                    msg.reply(msgReply);
                }
                else {
                    let msgReply = `Hi @${contact.number} From Node-Red.`
                    chat.sendMessage(msgReply, {
                        mentions : [contact]
                    });  
                }
                
            }

        });

        function WAClose(){
            try { 
                client.destroy();
            }
            catch(e){
                WAnode.err(`Error : Too many instructions! Try again.`)
            }
        };

        async function connectionSetup(){
            try {
                whatsappConnectionStatus = await client.getState();
                if(whatsappConnectionStatus === "CONNECTED"){
                    clearInterval(connectionSetupID);
                }
                else {
                    WAnode.log(`Status : Connecting to Whatsapp...`);
                }
            }
            catch(e){
                WAnode.log(`Error : Connection is slow...`);
            }
        };
        let connectionSetupID = setInterval(connectionSetup, 10000);  
        
        let WARestart = async function(){
            await client.destroy();
            await client.initialize();
        }

        this.on('close', (removed, done)=>{
            if(removed){
                clearInterval(connectionSetupID);
                WAClose();
            }
            else {
                clearInterval(connectionSetupID);
                WAClose();
            }
            done();

        });
        
    
        this.WAConnect = WAConnect;
        this.client = client;
        this.WARestart = WARestart;
        this.whatsappConnectionStatus = whatsappConnectionStatus;
    }
    RED.nodes.registerType("whatsappLink",RemoteClientNode);
}