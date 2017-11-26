new Vue({
    el: "#app", 
    data: {
        oeuvre: {
            title: 'test'
        }
    },
    created() {

        axios
        .get('http://localhost:3000/work/13920002')
        .then(response => {
            this.oeuvre = response.data
       
        })
        // .catch(e => () {

        // })
    }
})