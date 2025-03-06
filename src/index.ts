import initApp from "./server";

const port = process.env.PORT;

initApp().then((app) => {
    app.listen(port,() =>{
        console.log(`Exemple app listening on port http://localhost:${port}`);
        });
});