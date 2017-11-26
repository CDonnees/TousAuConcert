new Vue({
    el: "#app", 
    data: {
        expressions: []
    },
    created() {

        axios
        .get('http://localhost:3000/concert/http://data.doremus.org/expression/f1970557-3413-39ae-a3cc-c935c3d0bc4a')
        .then(response => {
            this.expressions = response.data
       
        })
        // .catch(e => () {

        // })
    }
})