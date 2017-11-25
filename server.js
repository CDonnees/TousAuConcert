const fetch = require('node-fetch');
const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Hey!'));

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


app.get('/work/:workid', async (req, res, next) => {
    try {
        res.json(await sparqlexec('http://data.bnf.fr/', 'SELECT ?x ?p WHERE {?x ?p ?o} LIMIT 2'));
    } catch (e) {
        //this will eventually be handled by your error handling middleware
        next(e)
    }
});


app.listen(3000, () => console.log('Example app listening on port 3000!'));
