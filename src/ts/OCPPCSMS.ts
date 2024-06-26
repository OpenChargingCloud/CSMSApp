/*
 * Copyright 2018-2024 GraphDefined GmbH <achim.friedland@graphdefined.com>
 * This file is part of CSMSApp <https://github.com/OpenChargingCloud/CSMSApp>
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export interface ElectronAPI {

    onWebSocketClientConnected: (callback: (data: { clientId: string, clientName: string, remoteSocket:  string, subprotocol: string }) => void) => void;
    onWSTextMessage:            (callback: (data: { clientId: string, clientName: string, textMessage:   string })                      => void) => void;
    onWSBinaryMessage:          (callback: (data: { clientId: string, clientName: string, binaryMessage: Buffer })                      => void) => void;
    onWSClientDisconnected:     (callback: (data: { clientId: string })                                                                 => void) => void;

    sendWSTextMessage:          (clientId: string, textMessage:   string) => void;
    sendWSBinaryMessage:        (clientId: string, binaryMessage: Buffer) => void;

}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}


import * as OCPPv2_1   from './IOCPPv2_1';

interface WriteToScreenDelegate {
    (message: string|Element): void;
}

interface wsClientInfos {
    id:           string;
    name:         string;
    subprotocol:  string;
    lastSeen:     Date;
}

export class OCPPCSMS {

    //#region Data

    private readonly wsClients:                                          Map<string, wsClientInfos> = new Map();

    private readonly connectedSystemsDiv:                                HTMLDivElement;

    private readonly commandsDiv:                                        HTMLDivElement;
    private readonly rawRequestDiv:                                      HTMLDivElement;

    private readonly controlDiv:                                         HTMLDivElement;

    private readonly buttonsDiv:                                         HTMLDivElement;
    private readonly showRAWRequestButton:                               HTMLButtonElement;

    private readonly sendRAWRequestButton:                               HTMLButtonElement;

    private readonly WriteToScreen:                                      WriteToScreenDelegate;


    private requestId: number = 100000;

    //#endregion

    //#region Constructor

    constructor(WriteToScreen: WriteToScreenDelegate)
    {

        this.WriteToScreen = WriteToScreen;

        //#region Data

        // Connected Systems
        this.connectedSystemsDiv                                     = document.querySelector("#connectedSystems")                                      as HTMLDivElement;


        // Control on the bottom
        this.controlDiv                                              = document.querySelector("#control")                                               as HTMLDivElement;

        // Buttons on the left
        this.buttonsDiv                                              = this.controlDiv.querySelector("#buttons")                                        as HTMLDivElement;
        this.showRAWRequestButton                                    = this.buttonsDiv.querySelector("#ShowRAWRequestButton")                           as HTMLButtonElement;

        this.showRAWRequestButton.onclick                            = () => this.showDialog(this.rawRequestDiv);

        // Commands on the right
        this.commandsDiv                                             = this.controlDiv. querySelector("#commands")                              as HTMLDivElement;
        this.rawRequestDiv                                           = this.commandsDiv.querySelector("#RAWRequest")                            as HTMLDivElement;

        this.sendRAWRequestButton                                    = this.rawRequestDiv.                          querySelector("#RAWRequestButton")                           as HTMLButtonElement;

        //this.sendRAWRequestButton.onclick                            = () => this.SendRAWRequest();

        //#endregion

        // this.startWebSocketServer();


        window.electronAPI.onWebSocketClientConnected(({ clientId, clientName, remoteSocket, subprotocol }) => {
            console.log(`Client '${clientName}' connected from '${remoteSocket}' using subprotocol '${subprotocol}'`);
            this.wsClients.set(clientId, { id: clientId, name: clientName, subprotocol: subprotocol, lastSeen: new Date() });
            this.updateClientLastSeen(clientId);
        });

        window.electronAPI.onWSTextMessage((message) => {
            console.log(`Received a text message from '${message.clientName}': ${message.textMessage}`);
            this.updateClientLastSeen(message.clientId);
        });

        window.electronAPI.onWSBinaryMessage((message) => {
            console.log(`Received a binary message from '${message.clientName}': ${message.binaryMessage}`);
            this.updateClientLastSeen(message.clientId);
        });

        window.electronAPI.onWSClientDisconnected(({ clientId }) => {
            console.log(`Client disconnected: ${clientId}`);
            this.wsClients.delete(clientId);
            this.updateClientLastSeen(clientId);
        });

    }

    //#endregion


    private updateClientLastSeen(clientId: string) {

        const clientInfo = this.wsClients.get(clientId);

        if (clientInfo) {
            clientInfo.lastSeen = new Date();
            this.wsClients.set(clientId, clientInfo);
        }

        this.updateConnectedSystems();

    }

    private updateConnectedSystems() {

        // Remove all existing connected systems
        while (this.connectedSystemsDiv.firstChild)
            this.connectedSystemsDiv.removeChild(this.connectedSystemsDiv.firstChild);

        // Convert the Map to an array and sort by lastSeen timestamp (newest first)
        const sortedClients = Array.from(this.wsClients.values()).sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());

        for (const wsClient of this.wsClients)
        {
            const clientDiv = document.createElement('div');
            clientDiv.textContent = wsClient[1].name;
            this.connectedSystemsDiv.appendChild(clientDiv);
        }

    }


    private sendWSTextMessage(clientId: string, message: string) {
        window.electronAPI.sendWSTextMessage(clientId, message);
    }

    private sendWSBinaryMessage(clientId: string, message: Buffer) {
        window.electronAPI.sendWSBinaryMessage(clientId, message);
    }


    //#region Helpers

    private showDialog(dialogDiv: HTMLDivElement) {

        for (const dialog of Array.from(document.querySelectorAll<HTMLDivElement>("#commands .command")))
            dialog.style.display = "none";

        dialogDiv.style.display = "block";

    }

    private ParseCustomData(CustomData?: string | null): OCPPv2_1.ICustomData|undefined
    {

        if (CustomData == null)
            return undefined;

        let customData = null;

        try
        {

            const json = JSON.parse(CustomData);

            if (json.hasOwnProperty('vendorId'))
                return json;

        } catch { }

        return undefined;

    }

    private removeNullsAndEmptyObjects(obj: any): any {
        for (let key in obj) {
            if (obj[key] == null || obj[key] === "") {
                delete obj[key];
            } else if (typeof obj[key] === 'object') {
                obj[key] = this.removeNullsAndEmptyObjects(obj[key]);
    
                // After cleaning the inner object, if it's empty, delete it too.
                if (Object.keys(obj[key]).length === 0) {
                    delete obj[key];
                }
            }
        }
        return obj;
    }

    public sendRAWRequest(message: string) {
/* 
        if (this.websocket &&
            this.websocket.readyState === WebSocket.OPEN)
        {

            this.WriteToScreen("SENT: " + message);
            this.websocket.send(message);

        }
 */
    }

    //#endregion


    public sendRequest(command: string, request: any) {

     /*    if (this.websocket &&
            this.websocket.readyState === WebSocket.OPEN)
        {

            const message = JSON.stringify([ 2,
                                             (this.requestId++).toString(),
                                             command,
                                             request != null
                                                 ? this.removeNullsAndEmptyObjects(request)
                                                 : {}
                                           ]);

            this.WriteToScreen("SENT: " + message);
            this.websocket.send(message);

        }
 */
    }

    public sendResponse(responseId: string,
                        response:   any) {
/* 
        if (this.websocket &&
            this.websocket.readyState === WebSocket.OPEN)
        {

            const message = JSON.stringify([ 3,
                                             responseId,
                                             response
                                           ]);

            this.WriteToScreen("REPLY: " + message);
            this.websocket.send(message);

        } */

    }

}
