new Vue({
    el: "#app", 
    data: {
        oeuvre: {
            title: 'test'
        }
    },
    created() {
        axios
        .get('./data.json')
        .then(response => {
            console.log(response.data)
            this.data = response.data
        })
        // .catch(e => () {

        // })
    }
})