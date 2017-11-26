new Vue({
    el: "#app", 
    data: {
        oeuvre: {
            title: 'test'
        },
        player: {
            cover: null,
            playlist: [],
        },
        critics: [],
        sheets: [],
    },
    created() {

        axios
        .get('http://localhost:3000/work/13920002')
        // .get('http://localhost:3000/work/14005127')
        .then(response => {
            this.oeuvre = response.data;
            if (response.data.eans && response.data.eans.length) {
                fetch(`http://localhost:3000/deezer/${response.data.eans.join(',')}`)
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
                fetch(`http://localhost:3000/critics/${response.data.prefLabel}/${response.data.year}`)
                    .then(response => response.json())
                    .then(response => {
                        this.critics = response;
                    });
            }
        })
        // .catch(e => () {

        // })
    }
})