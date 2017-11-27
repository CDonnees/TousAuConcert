/* global Vue */
new Vue({
    el: '#app',
    data: {
        expressions: [],
    },
    created() {
        fetch(
            'http://localhost:3000/concert/http://data.doremus.org/expression/f1970557-3413-39ae-a3cc-c935c3d0bc4a'
        )
            .then(response => response.json())
            .then(response => {
                this.expressions = response;
            });
    },
});
