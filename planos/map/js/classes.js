"use strict";

class Mensajero {
    /**
     *
     * @param mensaje {string}
     */
    notificar(mensaje) {
        console.log("mensajero:", mensaje);
    }
}

/**
 * Clase que representa un lote en el mapa.
 */
class Lote {
    constructor({codigo, nombre, color}) {
        /** @type {Number} */
        this.codigo = codigo;
        /** @type {String} */
        this.nombre = nombre;
        /** @type {String} */
        this.color = color;
        /** @type {Boolean} */
        this.visible = true;
    }

}

class MapManager {

    /**
     * @class MapManager
     * Clase que gestiona el mapa principal.
     *
     * @example
     * const mapManager = new MapManager();
     * mapManager.centerTo([-32.718193, -68.562772]);
     * mapManager.zoomTo(15);
     */
    constructor() {
        this.name = "MapManager";
        this.center = [-32.718193, -68.562772];
        this.zoom = 15;
        this._init();
        this.mensajero = new Mensajero();
    }

    _init() {
        this._map = L.map("map", {
            center: this.center,
            zoom: this.zoom,
        })

        this.initBaseLayers();
        // this.addZonasLayer();

    }

    initBaseLayers() {
        const openStreetMap = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors"});

        const satMutant = L.gridLayer.googleMutant({
            maxZoom: 24, type: "satellite",
        }).addTo(this._map);

        let baseLayers = {
            "Google Satellite": satMutant, OpenStreetMap: openStreetMap,
        };

        L.control.layers(baseLayers).addTo(this._map);

    }

    addLayer(layer) {
        layer.addTo(this._map);
    }

    /**
     *
     * @returns {L.Map}
     */
    getMap() {
        return this._map;
    }

    /**
     * Centra el mapa en las coordenadas indicadas
     * @param {Array.<number>} coord
     */
    centerTo(coord) {
        this._map.setView(coord, this.zoom);
    }

    /**
     * Establece el zoom
     * @param zoom {number}
     */
    zoomTo(zoom) {
        this._map.setZoom(zoom);
    }

    add(layer) {
        layer.addTo(this._map);
    }

}

export {
    Mensajero,
    Lote,
    MapManager,
}