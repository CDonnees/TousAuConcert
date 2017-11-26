const fetch = require('node-fetch');
const libxmljs = require("libxmljs");

async function fetchCriticsFromGallica(title, author, year) {
    const response = await fetch(`http://gallica.bnf.fr/SRU?operation=searchRetrieve&version=1.2&collapsing=disabled&query=text%20all%20%22${title}%20${author}%22%20%20and%20(dc.type%20all%20%22fascicule%22)%20and%20(gallicapublication_date%3E%3D%22${year}%2F01%2F01%22%20and%20gallicapublication_date%3C%3D%22${year}%2F12%2F31%22)%20&maximumRecords=50&startRecord=0`);
    return parseResults(await response.text());
}


async function fetchSheetsFromGallica(title, author) {
    const response = await fetch(`http://gallica.bnf.fr/SRU?operation=searchRetrieve&version=1.2&query=%28gallica%20all%20%22${title}%20${author}%22%29%20and%20dc.type%20all%20%22partition%22&suggest=0`);
    return parseResults(await response.text());
}


async function fetchSoundFromGallica(title, author) {
    const response = await fetch(`http://gallica.bnf.fr/SRU?operation=searchRetrieve&version=1.2&query=%28gallica%20all%20%22${title}%20${author}%22%29%20and%20dc.type%20all%20%22sonore%22&suggest=0`);
    return parseResults(await response.text());
}


function parseResults(xml) {
    var doc = libxmljs.parseXml(xml);
    var children = [];
    for (const dc of doc.find('.//oai_dc:dc', {oai_dc: 'http://www.openarchives.org/OAI/2.0/oai_dc/'})) {
        const properties = {};
        for (const child of dc.childNodes()) {
            if (child.type() === 'element') {
                const name = child.name();
                if (name === 'identifier' && child.text().startsWith('http://gallica.bnf.fr')) {
                    properties.uri = child.text();
                    properties.depiction = `${properties.uri}.lowres`;
                }
                if (properties.name !== undefined) {
                    properties[name] += '. - ' + child.text();
                } else {
                    properties[name] = child.text();
                }
            }
        }
        if (properties.type === 'document sonore') {
            properties.mp3uri = `${properties.uri}/f1.audio`;
        }
        children.push(properties);
    }
    return children;
}

module.exports = {
    fetchCriticsFromGallica,
    fetchSheetsFromGallica,
    fetchSoundFromGallica,
};