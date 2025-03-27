"use strict";

function loadKMLLotes(map) {
    if (!map) return;

    /**
     * @type{L.LayerGroup}
     */
    const layers = omnivore.kml("../capas/lotes.kml")
        .on("ready", function () {
            console.log(omnivore);
            console.log(this);
            //extraer los estilos
            const styles = this.getStyles();
            const style = this;
            console.log(style);
            console.log(styles);

            this.eachLayer(function (layer) {
                if (layer.feature.geometry.type !== "Polygon") return;
                const name = layer.feature.properties.name;
                const color = layer.feature.properties.color;
                layer.feature.properties.visible = true;
                layer.setStyle({
                    color: color,
                });
            })

        })

    layers.addTo(map);
    return layers;
}

function loadKMLZonas(map) {
    if (!map) return;
    // return omnivore.kml("capas/capas.kml").addTo(map);
    const layers = omnivore.kml("capas/capas.kml")
        .on("ready", function () {

            //extraer los estilos
            const styles = layers.getStyles();
            const style = this.getStyle("sn_ylw-pushpin1");
            console.log(style);
            console.log(styles);

            layers.eachLayer(function (layer) {
                if (layer instanceof L.Poligon) {  // Verifica si es una polilínea

                    const name = layer.feature.properties.name;

                    const properties = layer.feature?.properties || {};

                    console.log(`Coloreando: ${layer.feature?.properties?.name || "sin nombre"}`);

                    layer.setStyle({
                        color: properties.color,
                        weight: weight,
                        opacity: opacity,
                    });
                }
            });

        })

    layers.addTo(map);
    return layers;
}

/**
 * Cargar archivo kml
 * @param map {L.Map}
 * @param file {String}
 * @returns {L.LayerGroup}
 */
function loadKMLLayer(map, file) {

    return fetch(file)
        .then(res => res.text())
        .then(kmltest => {
            const parser = new DOMParser();
            const kml = parser.parseFromString(kmltest, "text/xml");
            const t = new L.KML(kml, {
                async: true,
                onEachFeature: function (layer, feature) {
                    console.log(layer, feature);
                },
            });

            t.addTo(map);

            const bounds = t.getBounds();
            map.fitBounds(bounds);

            return t;
        })

}

export {
    initMap,
    centerMap,
    initBaseLayers,
    loadKMLLotes,
    loadKMLZonas,
    loadKMLLayer,
};

