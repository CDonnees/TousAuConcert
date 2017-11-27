/* global Vue */
new Vue({
    el: '#app',
    data: {
        oeuvre: {
            title: 'test',
        },
        player: {
            cover: null,
            playlist: [],
        },
        critics: [],
        sheets: [],
        sound: [],
    },
    created() {
        var param = document.location.search.split('?')[1];
        var params = param.split('&');
        var work_id = params[0].split('=')[1];
        fetch('http://localhost:3000/work/' + work_id)
            .then(response => response.json())
            .then(response => {
                this.oeuvre = response;
                if (response.eans && response.eans.length) {
                    fetch(`http://localhost:3000/deezer/${response.eans.join(',')}`)
                        .then(response => response.json())
                        .then(response => {
                            for (const album of response) {
                                if (album.id && album.tracks && album.tracks.length) {
                                    this.player.cover = album.cover;
                                    this.player.playlist = album.tracks;
                                    break;
                                }
                            }
                        });
                }
                let compname = response.contributors.compositeur[0].prefLabel;
                compname = compname.split('(')[0].trim();
                fetch(
                    `http://localhost:3000/critics/${response.prefLabel}/${compname}/${
                        response.year
                    }`
                )
                    .then(response => response.json())
                    .then(response => {
                        this.critics = response;
                    });
                fetch(`http://localhost:3000/sound/${response.prefLabel}/${compname}`)
                    .then(response => response.json())
                    .then(response => {
                        this.sound = response;
                    });
            });
        // .catch(e => () {

        // })
    },
});