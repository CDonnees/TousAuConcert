const _ = require('lodash');
const fetch = require('node-fetch');

function simplifyAlbumInfos(infos) {
    return {
        id: infos.id,
        title: infos.title,
        upc: infos.upc,
        cover: infos.cover_big,
        releaseDate: infos.release_date,
        tracks: infos.tracks ? infos.tracks.data.filter(track => track.readable && track.preview).map(track => _.pick(track, 'title', 'preview')) : [],
    };
}


async function fetchFromDeezer(eans) {
    const albumInfos = [];
    for (const ean of eans) {
        const response = await fetch(`https://api.deezer.com/album/upc:${ean}`);
        const infos = await response.json();
        if (!infos.errors) {
            albumInfos.push(simplifyAlbumInfos(infos));
        }
    }
    return albumInfos;
}

exports.fetchFromDeezer = fetchFromDeezer;
