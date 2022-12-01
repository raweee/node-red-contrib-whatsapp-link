module.exports = function(RED) {
    const QRCode = require('qrcode');
     
    function WhatsappAdmin(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var whatsappLinkNode = RED.nodes.getNode(config.whatsappLink);
        node.waClient = whatsappLinkNode.client;
        node.WARestart = whatsappLinkNode.WARestart;
        node.WAConnect = whatsappLinkNode.WAConnect;
            
        function SetStatus(WAStatus, color){
            node.status({fill:color,shape:"dot",text:WAStatus});
            msg = {payload : WAStatus};
            node.send(msg);    
        };
                
         // Commands recived for Whatsapp Client.

        this.on('input', function(msg, send){
            if (msg.payload === "destroy") {
                node.waClient.destroy();
                SetStatus("Disconnected","red");
            } 
            else if (msg.payload==="logout") {
                node.waClient.logout();
                SetStatus("Logged Out..","red");
            }
            else if (msg.payload === "test"){
                async function test() {
                   msg.payload = await node.waClient.getState();
                   node.send(msg);
                }
                test();
            }           
            else if (msg.payload === "restart"){
                node.WARestart();
                SetStatus("Connecting...", "yellow");
            };        
        });

        this.on(`close`, ()=>{
            SetStatus("Disconnected", "red");
        });

        //QR Code generation.
        node.waClient.on('qr', (qr) => {
            QRCode.toString(qr, {type : 'terminal', small:true }, function(err, QRTerminal){
                console.log("To Connect, Scan the QR Code through your Whatsapp Mobile App.")
                console.log(QRTerminal);
            });
            SetStatus("QR Code Generated", "yellow");
            QRCode.toDataURL(qr, function(err, url){
                SetStatus("Scan QR in Terminal", "green");
                msg = {payload : url};
                node.send(msg);
            });
        });
        
        SetStatus("Connecting...", "yellow");
        node.waClient.on('ready', () => {
            console.log('Whatsapp Client is ready!');
            SetStatus('Connected','green');
        });

        node.waClient.on('disconnected', () => {
            console.log('WA Client is Disconnected!');
            SetStatus("Disconeccted","red");
        });
    }
    RED.nodes.registerType("whatsapp-admin", WhatsappAdmin);
}
