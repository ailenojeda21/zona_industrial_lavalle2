"use strict";
import {MapManager} from "./js/classes.js";
import {center_map} from "./js/parameters.js";
import {EmpresasManager} from "./js/empresa_utils.js";
import {lotes} from "./js/database.js";
import {colores} from "./js/utils.js";

/* iniciar mapa */
const mapManager = new MapManager();
mapManager.centerTo(center_map);
mapManager.zoomTo(16);

/* iniciar empresas */
const empresasManager = new EmpresasManager($("#tabla_lotes"), lotes, {});

let layer_lotes;
let layer_zonas;

// Load and add KML layer lotes
fetch("capas/lotes.kml")
    .then(res => res.text())
    .then(kmltext => {
        // Parse the KML
        const parser = new DOMParser();
        const kml = parser.parseFromString(kmltext, "text/xml");
        // Create and add the KML layer
        layer_lotes = new L.KML(kml, {empresasManager: empresasManager});

        mapManager.addLayer(layer_lotes);
    })
    .catch(error => console.error("Error loading KML:", error));

// Load and add KML layer zonas
fetch("capas/capas.kml")
    .then(res => res.text())
    .then(kmltext => {
        // Parse the KML
        const parser = new DOMParser();
        const kml = parser.parseFromString(kmltext, "text/xml");
        // Create and add the KML layer
        layer_zonas = new L.KMLZonas(kml, {colors: colores});
        //mapManager.addLayer(layer_zonas);

    })
    .catch(error => console.error("Error loading KML:", error));

const check_zonas = $("#activar_zona");
check_zonas.on("change", function () {
    if (this.checked) {
        mapManager.getMap().addLayer(layer_zonas);
    } else {
        mapManager.getMap().removeLayer(layer_zonas);
    }
});