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
        var param = document.location.search.split('?')[1];
        var params = param.split('&');
        var work_id = params[0].split('=')[1];
        axios
        .get('http://localhost:3000/work/'+work_id)
        //.get('http://localhost:3000/work/14005127')
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
            }
            let compname = response.data.contributors.compositeur[0].prefLabel;
            compname = compname.split('(')[0].trim();
            fetch(`http://localhost:3000/critics/${response.data.prefLabel}/${compname}/${response.data.year}`)
                .then(response => response.json())
                .then(response => {
                    this.critics = response;
                });
})
        // .catch(e => () {

        // })
    }
})