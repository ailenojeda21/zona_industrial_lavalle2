/**
 * Generate a #HEX color
 * @returns {string}
 * @example
 *
 * generateRandomHexColor() // #9c892a
 *
 */
function generateRandomHexColor() {
    return "#" + Math.floor(Math.random() * 16777215).toString(16);
}

const colores = {
    naranja: "#ff4800",
    azul: "#0000FF",
    verde: "#008000",
    transparente: "#FFFFFF",
}

export {
    colores,
    generateRandomHexColor,
}