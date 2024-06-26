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

import * as OCPP from './OCPPCSMS';

class csmsApp {

    //#region Data

    private readonly ocppCSMSProxy:  OCPP.OCPPCSMS;
    private readonly LogView:        HTMLDivElement;

    //#endregion

    constructor()
    {
        this.ocppCSMSProxy  = new OCPP.OCPPCSMS((t) => this.writeToScreen(t));
        this.LogView        = document.querySelector("#logView") as HTMLDivElement;
    }

    private writeToScreen(message: string|Element) {

        if (typeof message === 'string')
            this.LogView.insertAdjacentHTML("afterbegin",
                                            "<p>" + message + "</p>");

        else
            this.LogView.insertAdjacentElement("afterbegin",
                                               document.createElement('p').
                                                        appendChild(message));

    }

}

const app = new csmsApp();
