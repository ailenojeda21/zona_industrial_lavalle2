"use strict";
import {generateRandomHexColor} from "./utils.js";
import {Lote} from "./database.js";

class EmpresasManager {

    /**
     * @param el {HTMLElement}
     * @param lotes {Lote[]}
     * @param events {object}
     */
    constructor(el, lotes, events) {
        this._el = $(el);
        this.lotes = lotes;
        this.events = events;
        if (this.lotes) {
            this.lotes.map(item => {
                item.color = generateRandomHexColor()
            })
        }
        this._init();
    }

    _init() {
        const $body = this._el.find("tbody");
        this.lotes.map(item => {
            // console.log(item);

            const tr = document.createElement("tr");
            const td1 = document.createElement("td");
            const td2 = document.createElement("td");
            const td3 = document.createElement("td");
            const td4 = document.createElement("td");

            tr.appendChild(td1);
            tr.appendChild(td2);
            tr.appendChild(td3);
            tr.appendChild(td4);

            const input = document.createElement("input");
            input.setAttribute("data-empresa", item.empresa);
            input.setAttribute("type", "checkbox");
            input.setAttribute("name", item.empresa);
            input.setAttribute("id", item.empresa);
            input.setAttribute("checked", item.visible.toString());
            input.setAttribute("onchange", "actualizar_capa_visible(event)");

            td1.appendChild(input);
            td2.innerText = item.codigo.toString();
            td3.innerText = item.nombre;

            const inputColor = document.createElement("input");
            inputColor.setAttribute("data-empresa", item);
            inputColor.setAttribute("type", "color");
            inputColor.value = item.color;
            inputColor.addEventListener("onchange", this.actualizarCapaColor.bind(this));
            td4.appendChild(inputColor);

            $body.append(tr);

        })

    }

    actualizarCapaColor(event) {
        const empresa = event.target.dataset.empresa;
        const color = event.target.value;
        this.lotes.map(item => {
            if (item.nombre === empresa) {
                item.color = color;
                console.log("Color actualizado")
            }
        })
    }

}

export {
    EmpresasManager,
}