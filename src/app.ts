import express from 'express';
import moment from 'moment';
import fs from 'fs';

type Port = string | number;
interface ClientMessage {
  text: string;
  sender: string;
}

interface ServerMessage {
  text: string;
  sender: string;
  timestamp: string;
}

const app = express();
const port = process.env.PORT || 49001;
let messages: ServerMessage[] = [];

const utcNow = (): string => moment.utc().format("MM/DD/YYYY HH:mm:ss"); // MM/DD/YYYY HH:mm:ss
const stringDateToMilliseconds = (date: string): number => Date.parse(date);
const addClientMessage = (clientMessage: ClientMessage) => {
  if (messages.length >= 40) messages.shift();
  messages.push({...clientMessage, timestamp: utcNow()});
};
const serverSendResponse = (responder: express.Response, messages: ServerMessage[]) => responder.send(JSON.stringify({messages}));

const loadMessages = () => {
  var messagesJson = fs.readFileSync("./savedMessages.json").toString();
  var messagesObj: {messages: ServerMessage[]} = JSON.parse(messagesJson);
  messages = messagesObj.messages;
};

const saveMessages = () => {
  fs.writeFileSync("./savedMessages.json", JSON.stringify({messages}), 'utf8');
};

const onClientRefresh = (req: express.Request, res: express.Response) => {
  serverSendResponse(res, messages);
};

const onClientSend = (req: express.Request, res: express.Response) => {
  var text = req.header("text");
  var sender = req.header("sender");
  var clientMessage: ClientMessage | undefined = text && sender ? {text, sender} : undefined;

  if(clientMessage) {
    console.log(JSON.stringify(clientMessage));
    addClientMessage(clientMessage);
  }
  serverSendResponse(res, messages);
};

const serverListen = (port: Port) =>
  app.listen(port, () =>
    console.log(`App listening at http://localhost:${port}`)
  );
 
const exitHandler = (options: any, exitCode: number) => {
  saveMessages();
  if (options.cleanup) console.log('clean');
  if (exitCode || exitCode === 0) console.log(exitCode);
  if (options.exit) process.exit();
}
const registerExitHandlers = () => {
  //do something when app is closing
  process.on('exit', exitHandler.bind(null,{cleanup:true}));
  //catches ctrl+c event
  process.on('SIGINT', exitHandler.bind(null, {exit:true}));
  // catches "kill pid" (for example: nodemon restart)
  process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
  process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
  //catches uncaught exceptions
  process.on('uncaughtException', exitHandler.bind(null, {exit:true}));
};

const main = () => {
  loadMessages();
  app.get("/", onClientRefresh);
  app.post("/", onClientSend);
  serverListen(port);
  registerExitHandlers();
};

main();