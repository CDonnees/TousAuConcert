const fetch = require('node-fetch');
const express = require('express');

const {fetchCriticsFromGallica, fetchSheetsFromGallica, fetchSoundFromGallica} = require('./sru');

const app = express();

app.get('/', (req, res) => res.send('Hey!'));

const CACHE = new Map();
const roles = {
    r70: 'auteur du texte',
    r80: 'auteur de l\'argument',
    r160: 'chorégraphe',
    r220: 'compositeur',
};


const databnfPrefixes = {
    'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
    'skos': 'http://www.w3.org/2004/02/skos/core#',
    'foaf': 'http://xmlns.com/foaf/0.1/',
    'xfoaf': 'http://www.foafrealm.org/xfoaf/0.1/',
    'dcmitype': 'http://purl.org/dc/dcmitype/',
    'ore': 'http://www.openarchives.org/ore/terms/',
    'ark': 'http://ark.bnf.fr/ark:/12148/',
    'dbpedia': 'http://dbpedia.org/',
    'dbpediaowl': 'http://dbpedia.org/ontology/',
    'dbprop': 'http://dbpedia.org/property/',
    'rdagroup2elements': 'http://rdvocab.info/ElementsGr2/',
    'frbr': 'http://rdvocab.info/uri/schema/FRBRentitiesRDA/',
    'rdarole': 'http://rdvocab.info/roles/',
    'rdagroup1elements': 'http://rdvocab.info/Elements/',
    'rdarelationships': 'http://rdvocab.info/RDARelationshipsWEMI/',
    'og': 'http://ogp.me/ns#',
    'bnf-onto': 'http://data.bnf.fr/ontology/bnf-onto/',
    'dcterms': 'http://purl.org/dc/terms/',
    'owl': 'http://www.w3.org/2002/07/owl#',
    'time': 'http://www.w3.org/TR/owl-time/',
    'marcrel': 'http://id.loc.gov/vocabulary/relators/',
    'bnfroles': 'http://data.bnf.fr/vocabulary/roles/',
    'mo': 'http://purl.org/ontology/mo/',
    'geo': 'http://www.w3.org/2003/01/geo/wgs84_pos#',
    'ign': 'http://data.ign.fr/ontology/topo.owl/',
    'insee': 'http://rdf.insee.fr/geo/',
    'gn': 'http://www.geonames.org/ontology/ontology_v3.1.rdf/',
    'dcdoc': 'http://dublincore.org/documents/',
    'bio': 'http://vocab.org/bio/0.1/',
    'isni': 'http://isni.org/ontology#',
    'bibo': 'http://purl.org/ontology/bibo/',
    'schema': 'http://schema.org/',
}


/**
 * > ns_prop('http://www.w3.org/2004/02/skos/core#prefLabel',
              DatabnfDatabase.namespaces)
   'skos:prefLabel'
 *
 * @param {*} uri
 * @param {*} namespaces
 */
function nsprop(uri, namespaces) {
    for (const ns of Object.keys(namespaces)) {
        const prefix = namespaces[ns];
        if (uri.startsWith(prefix)) {
            return `${ns}:${uri.slice(prefix.length)}`;
        }
    }
    return uri;
}


function simplifyData(data, namespaces) {
    const props = {};
    for (let {attr, value} of data) {
        if (attr === undefined) {
            continue;
        }
        attr = nsprop(attr, namespaces);
        if (props[attr] !== undefined) {
            const propval = props[attr];
            if (propval instanceof Array) {
                propval.push(value);
            } else {
                props[attr] = [propval, value];
            }
        } else {
            props[attr] = value;
        }
    }
    return props;
}

function exposeData(data) {
    const normalizeMap = {
        'skos:note': 'notes',
        'skos:prefLabel': 'prefLabel',
        'skos:altLabel': 'altLabels',
        'bnf-onto:lastYear': 'year',
        'rdarelationships:expressionOfWok': 'expressions',
        'dcterms:description': 'description',
        'mo:genre': 'genre',
        'contributors': 'contributors',
        'foaf:depiction': 'depictions',
        'dbpedia:abstract': 'abstract',
        'http://data.bnf.fr/vocabulary/roles/r70': 'r70',
        'http://data.bnf.fr/vocabulary/roles/r80': 'r80',
        'http://data.bnf.fr/vocabulary/roles/r160': 'r160',
        'http://data.bnf.fr/vocabulary/roles/r220': 'r220',
        'eans': 'eans',
    };
    const exposed = {};
    for (const key of Object.keys(normalizeMap)) {
        if (data[key] !== undefined) {
            exposed[normalizeMap[key]] = data[key];
        }
    }
    return exposed;
}

function parseJsonResults(rset) {
    const results = [];
    for (const row of rset.results.bindings) {
        const result = {};
        for (const varname of rset.head.vars) {
            result[varname] = row[varname].value;
        }
        results.push(result);
    }
    return results;
}


async function sparqlexec(endpoint, query) {
    const format = 'application/sparql-results+json';
    const result = await fetch(`${endpoint}?query=${encodeURIComponent(query)}&format=${encodeURIComponent(format)}&timeout=0`);
    return parseJsonResults(await result.json());
}


async function fetchFromDbpedia(uri) {
    const dbpediaInfos = await sparqlexec('http://fr.dbpedia.org/sparql', `
    SELECT ?abstract WHERE {
        <${uri}> <http://dbpedia.org/ontology/abstract> ?abstract.
        FILTER (lang(?abstract) = 'fr')
    }`);
    return dbpediaInfos.length === 1 ? dbpediaInfos[0] : null;
}


async function bnfFetchAuthority(noticeid) {
    const match = /ark:\/12148\/cb([0-9]{8})/.exec(noticeid);
    if (match !== null) {
        noticeid = match[1];
    }
    if (CACHE.has(noticeid)) {
        return CACHE.get(noticeid);
    }
    let rawData = await sparqlexec('http://data.bnf.fr/sparql', `
    SELECT ?attr ?value WHERE {
        ?work bnf-onto:FRBNF "${noticeid}"^^xsd:integer.
        ?work ?attr ?value.
    }`);
    rawData = rawData.concat(await sparqlexec('http://data.bnf.fr/sparql', `
    SELECT ?attr ?value WHERE {
        ?concept bnf-onto:FRBNF "${noticeid}"^^xsd:integer.
        ?concept foaf:focus ?work.
        ?work ?attr ?value.
    }`));
    rawData = simplifyData(rawData, databnfPrefixes);
    if (rawData['owl:sameAs'] !== undefined && rawData['owl:sameAs'] instanceof Array) {
        for (const uri of rawData['owl:sameAs']) {
            if (uri.startsWith('http://fr.dbpedia.org')) {
                rawData['dbpedia:abstract'] = await fetchFromDbpedia(uri);
            }
        }
    }
    rawData = exposeData(rawData);
    CACHE.set(noticeid, rawData);
    return rawData;
}


async function fetchEANs(workid) {
    const eanData = await sparqlexec('http://data.bnf.fr/sparql', `
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    PREFIX rdarelationships: <http://rdvocab.info/RDARelationshipsWEMI/>
    PREFIX bnfroles: <http://data.bnf.fr/vocabulary/roles/>

    select distinct ?ean where {
        ?concept bnf-onto:FRBNF "${workid}"^^xsd:integer ;
               foaf:focus ?work.
        ?manifestation bnf-onto:ean ?ean ;
                       rdarelationships:workManifested ?work.
        }`
    );
    return eanData.map(row => row.ean);
}


async function bnfFetchWork(workid) {
    let workData = await bnfFetchAuthority(workid);
    workData.eans = await fetchEANs(workid);
    let contributorRoles = await sparqlexec('http://data.bnf.fr/sparql', `
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>
    PREFIX rdarelationships: <http://rdvocab.info/RDARelationshipsWEMI/>
    PREFIX bnfroles: <http://data.bnf.fr/vocabulary/roles/>

    select distinct ?authorConcept ?rel where {
      ?concept bnf-onto:FRBNF "${workid}"^^xsd:integer ;
               foaf:focus ?work.
      ?work rdarelationships:expressionOfWork ?expr.
      ?expr owl:sameAs ?newExpr.
      ?newExpr ?rel ?author.
      ?oldAuthor owl:sameAs ?author.
      ?authorConcept foaf:focus ?oldAuthor.

      FILTER REGEX(?rel, '^http://data.bnf.fr/vocabulary/roles/(${Object.keys(roles).join("|")})')
    }    `);
    const contributors = {};
    for (let {authorConcept, rel} of contributorRoles) {
        rel = rel.slice(rel.lastIndexOf('/') + 1);
        const authordata = await bnfFetchAuthority(authorConcept);
        if (contributors[rel] === undefined) {
            contributors[rel] = [authordata];
        } else {
            contributors[rel].push(authordata);
        }
    }
    workData.contributors = contributors;
    return workData;
}

app.get('/critics/:title/:year', async(req, res, next) => {
    try {
        res.json(await fetchCriticsFromGallica(req.params.title, req.params.year));
    } catch (e) {
        //this will eventually be handled by your error handling middleware
        next(e)
    }
});


app.get('/sheets/:title', async(req, res, next) => {
    try {
        res.json(await fetchSheetsFromGallica(req.params.title));
    } catch (e) {
        //this will eventually be handled by your error handling middleware
        next(e)
    }
});


app.get('/sound/:title', async(req, res, next) => {
    try {
        res.json(await fetchSoundFromGallica(req.params.title));
    } catch (e) {
        //this will eventually be handled by your error handling middleware
        next(e)
    }
});


app.get('/work/:workid', async(req, res, next) => {
    try {
        res.json(await bnfFetchWork(req.params.workid));
    } catch (e) {
        //this will eventually be handled by your error handling middleware
        next(e)
    }
});


app.listen(3000, () => console.log('Example app listening on port 3000!'));
