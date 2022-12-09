module.exports = function(RED) {
    const { Client, LocalAuth } = require('whatsapp-web.js');
    const QRCode = require('qrcode');

    function RemoteClientNode(n) {
        RED.nodes.createNode(this,n);
        let WAnode = this;
        let whatsappConnectionStatus;

        const client = new Client({
            authStrategy : new LocalAuth(),
            puppeteer : {headless : true }
        });
        // WAnode.log(`Client is generated`);
       
        let WAConnect = function(){
            try {
                client.initialize();
                WAnode.log("Status : Initializing Whatsapp..");
            }
            catch(e) {
                WAnode.log(`Error : ${e}`);
                WAnode.log(`Error : Unable to start Whatsapp. Try Again..`);
            };

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
                WAnode.log(`Error : ${e}`);
                WARestart();
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