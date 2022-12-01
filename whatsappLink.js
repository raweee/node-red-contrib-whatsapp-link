module.exports = function(RED) {
    const { Client, LocalAuth } = require('whatsapp-web.js');

    function RemoteClientNode(n) {
        RED.nodes.createNode(this,n);
        let WAnode = this;
        WAnode.client = n.cName;
        let WAClientID = `${n.cName}ID`;
        
        WAnode.client = new Client({
            authStrategy : new LocalAuth({
                clientId : WAClientID
            }),
            puppeteer : {headless : true }
        });

        let WAConnect = function(){
            WAnode.client.initialize();
            WAnode.log("Connecting to Whatsapp..");
        };
        WAConnect();

        let WARestart = function(){
            WAnode.client.destroy();
            WAnode.client.initialize();
        }
 
        this.on('close', (removed, done)=>{
            if(!removed){
                console.log(`closing WA admin closing in new line also`)
                async function distroyWA() {
                    await WAnode.client.destroy();
                };
                distroyWA();
            }
            done();
        });
        
        //this.client = client ;
        this.WAConnect = WAConnect;
        this.WARestart = WARestart;
    }
    RED.nodes.registerType("whatsappLink",RemoteClientNode);
}