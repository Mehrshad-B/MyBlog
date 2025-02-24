/*********************************************************************************
 *  WEB322 – Assignment 06
 *  I declare that this assignment is my own work in accordance with Seneca Academic Policy.
 *  No part of this assignment has been copied manually or electronically from any other source
 *  (including web sites) or distributed to other students.
 *
 *  Name: Mehrshad Besarati Student ID: 167019215 Date: 3/31/2023
 *
 *  Cyclic Web App URL: https://erin-good-barracuda.cyclic.app/
 *
 *  GitHub Repository URL: https://github.com/Mehrshad-B/web322-app.git
 *
 ********************************************************************************/

var HTTP_PORT = process.env.PORT || 8080;
var express = require("express");
var app = express();
const multer = require("multer");
const upload = multer();
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const exphbs = require("express-handlebars");
const stripJs = require("strip-js");
const blogService = require("./blog-service");
const authData = require("./auth-service");
const clientSessions = require("client-sessions");
app.engine(
    ".hbs",
    exphbs.engine({
        extname: ".hbs",
        helpers: {
            navLink: function(url, options) {
                return (
                    "<li" +
                    (url == app.locals.activeRoute ? ' class="active" ' : "") +
                    '><a href="' +
                    url +
                    '">' +
                    options.fn(this) +
                    "</a></li>"
                );
            },

            equal: function(lvalue, rvalue, options) {
                if (arguments.length < 3)
                    throw new Error("Handlebars Helper equal needs 2 parameters");
                if (lvalue != rvalue) {
                    return options.inverse(this);
                } else {
                    return options.fn(this);
                }
            },

            safeHTML: function(context) {
                return stripJs(context);
            },

            formatDate: function(dateObj) {
                dateObj = new Date();
                let year = dateObj.getFullYear();
                let month = (dateObj.getMonth() + 1).toString();
                let day = dateObj.getDate().toString();
                return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            },
        },
    })
);
app.set("view engine", ".hbs");

cloudinary.config({
    cloud_name: "djwgeqepd",
    api_key: "798288718817941",
    api_secret: "Sd_G6l0Mp6WjxWkbbP1OdK7VeWk",
    secure: true,
});

app.use(express.static("public"));

app.use(
    clientSessions({
        cookieName: "session", // this is the object name that will be added to 'req'
        secret: "week10example_web322", // this should be a long un-guessable string.
        duration: 2 * 60 * 1000, // duration of the session in milliseconds (2 minutes)
        activeDuration: 1000 * 60, // the session will be extended by this many ms each request (1 minute)
    })
);

function ensureLogin(req, res, next) {
    if (!req.session.user) {
        res.redirect("/login");
    } else {
        next();
    }
}

app.use(function(req, res, next) {
    res.locals.session = req.session;
    next();
});

app.use(function(req, res, next) {
    let route = req.path.substring(1);
    app.locals.activeRoute =
        "/" +
        (isNaN(route.split("/")[1]) ?
            route.replace(/\/(?!.*)/, "") :
            route.replace(/\/(.*)/, ""));
    app.locals.viewingCategory = req.query.category;
    next();
});

app.use(express.urlencoded({ extended: true }));

app.get("/", function(req, res) {
    res.redirect("/blog");
});

app.get("/about", function(req, res) {
    res.render("about");
});

app.get("/blog", async(req, res) => {
    // Declare an object to store properties for the view
    let viewData = {};

    try {
        // declare empty array to hold "post" objects
        let posts = [];

        // if there's a "category" query, filter the returned posts by category
        if (req.query.category) {
            // Obtain the published "posts" by category
            posts = await blogService.getPublishedPostsByCategory(req.query.category);
        } else {
            // Obtain the published "posts"
            posts = await blogService.getPublishedPosts();
        }

        // sort the published posts by postDate
        posts.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

        // get the latest post from the front of the list (element 0)
        let post = posts[0];

        // store the "posts" and "post" data in the viewData object (to be passed to the view)
        viewData.posts = posts;
        viewData.post = post;
    } catch (err) {
        viewData.message = "no results";
    }

    try {
        // Obtain the full list of "categories"
        let categories = await blogService.getCategories();

        // store the "categories" data in the viewData object (to be passed to the view)
        viewData.categories = categories;
    } catch (err) {
        viewData.categoriesMessage = "no results";
    }

    // render the "blog" view with all of the data (viewData)
    res.render("blog", { data: viewData });
});

app.get("/blog/:id", async(req, res) => {
    // Declare an object to store properties for the view
    let viewData = {};

    try {
        // declare empty array to hold "post" objects
        let posts = [];

        // if there's a "category" query, filter the returned posts by category
        if (req.query.category) {
            // Obtain the published "posts" by category
            posts = await blogService.getPublishedPostsByCategory(req.query.category);
        } else {
            // Obtain the published "posts"
            posts = await blogService.getPublishedPosts();
        }

        // sort the published posts by postDate
        posts.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

        // store the "posts" and "post" data in the viewData object (to be passed to the view)
        viewData.posts = posts;
    } catch (err) {
        viewData.message = "no results";
    }

    try {
        // Obtain the post by "id"
        viewData.post = await blogService.getPostById(req.params.id);
    } catch (err) {
        viewData.message = "no results";
    }

    try {
        // Obtain the full list of "categories"
        let categories = await blogService.getCategories();

        // store the "categories" data in the viewData object (to be passed to the view)
        viewData.categories = categories;
    } catch (err) {
        viewData.categoriesMessage = "no results";
    }

    // render the "blog" view with all of the data (viewData)
    res.render("blog", { data: viewData });
});

app.get("/posts", ensureLogin, function(req, res) {
    if (req.query.category) {
        blogService
            .getPostsByCategory(req.query.category)
            .then(function(data) {
                if (data.length > 0) {
                    res.render("posts", { posts: data });
                } else {
                    res.render("posts", { message: "no results" });
                }
            })
            .catch(function(err) {
                res.render("posts", { message: err });
            });
    } else if (req.query.minDate) {
        blogService
            .getPostsByMinDate(req.query.minDate)
            .then((data) => {
                if (data.length > 0) {
                    res.render("posts", { posts: data });
                } else {
                    res.render("posts", { message: "no results" });
                }
            })
            .catch(function(err) {
                res.render("posts", { message: err });
            });
    } else {
        blogService
            .getAllPosts()
            .then(function(data) {
                if (data.length > 0) {
                    res.render("posts", { posts: data });
                } else {
                    res.render("posts", { message: "no results" });
                }
            })
            .catch(function(err) {
                res.render("posts", { message: err });
            });
    }
});

app.get("/post/:id", ensureLogin, function(req, res) {
    blogService
        .getPostById(req.params.id)
        .then(function(data) {
            res.json(data);
        })
        .catch(function(err) {
            res.send(err);
        });
});

app.get("/categories", ensureLogin, function(req, res) {
    blogService
        .getCategories()
        .then(function(data) {
            if (data.length > 0) {
                res.render("categories", { categories: data });
            } else {
                res.render("categories", { message: "no results" });
            }
        })
        .catch(function(err) {
            res.render("categories", { message: err });
        });
});

app.get("/posts/add", ensureLogin, (req, res) => {
    blogService
        .getCategories()
        .then((data) => {
            res.render("addPost", { categories: data });
        })
        .catch((err) => {
            res.render("addPost", { categories: [] });
        });
});

app.get("/categories/add", ensureLogin, (req, res) => {
    res.render("addCategory");
});

app.get("/posts/delete/:id", ensureLogin, (req, res) => {
    blogService
        .deletePostById(req.params.id)
        .then(() => {
            res.redirect("/posts");
        })
        .catch(() => {
            res.status(500).send("Unable to Remove Post / Post not found");
        });
});

app.get("/categories/delete/:id", ensureLogin, (req, res) => {
    blogService
        .deleteCategoryById(req.params.id)
        .then(() => {
            res.redirect("/categories");
        })
        .catch(() => {
            res.status(500).send("Unable to Remove Category / Category not found");
        });
});

app.post(
    "/posts/add",
    upload.single("featureImage"),
    ensureLogin,
    (req, res) => {
        if (req.file) {
            let streamUpload = (req) => {
                return new Promise((resolve, reject) => {
                    let stream = cloudinary.uploader.upload_stream((error, result) => {
                        if (result) {
                            resolve(result);
                        } else {
                            reject(error);
                        }
                    });

                    streamifier.createReadStream(req.file.buffer).pipe(stream);
                });
            };

            async function upload(req) {
                let result = await streamUpload(req);
                console.log(result);
                return result;
            }

            upload(req).then((uploaded) => {
                processPost(uploaded.url);
            });
        } else {
            processPost("");
        }

        function processPost(imageUrl) {
            req.body.featureImage = imageUrl;
            blogService
                .addPost(req.body)
                .then(() => {
                    res.redirect("/posts");
                })
                .catch((err) => {
                    res.redirect("/posts/add");
                });
            // TODO: Process the req.body and add it as a new Blog Post before redirecting to /posts
        }
    }
);

app.post("/categories/add", ensureLogin, (req, res) => {
    if (req.file) {
        let streamUpload = (req) => {
            return new Promise((resolve, reject) => {
                let stream = cloudinary.uploader.upload_stream((error, result) => {
                    if (result) {
                        resolve(result);
                    } else {
                        reject(error);
                    }
                });

                streamifier.createReadStream(req.file.buffer).pipe(stream);
            });
        };

        async function upload(req) {
            let result = await streamUpload(req);
            console.log(result);
            return result;
        }

        upload(req).then((uploaded) => {
            processPost(uploaded.url);
        });
    } else {
        processPost("");
    }

    function processPost() {
        blogService
            .addCategory(req.body)
            .then(() => {
                res.redirect("/categories");
            })
            .catch((err) => {
                res.redirect("/categories/add");
            });
    }
});

app.get("/login", (req, res) => {
    res.render("login", {
        layout: "main",
    });
});

app.get("/register", (req, res) => {
    res.render("register", {
        layout: "main",
    });
});

app.post("/register", (req, res) => {
    authData
        .registerUser(req.body)
        .then(() => {
            res.render("register", { successMessage: "User created" });
        })
        .catch((err) => {
            res.render("register", {
                errorMessage: err,
                userName: req.body.userName,
                layout: "main",
            });
        });
});

app.post("/login", (req, res) => {
    req.body.userAgent = req.get("User-Agent");
    authData
        .checkUser(req.body)
        .then((user) => {
            req.session.user = {
                userName: user.userName,
                email: user.email,
                loginHistory: user.loginHistory,
            };

            res.redirect("/posts");
        })
        .catch((err) => {
            res.render('login', {
                errorMessage: err,
                userName: req.body.userName,
                layout: "main",
            });
        });
});

app.get("/logout", (req, res) => {
    req.session.reset();
    res.redirect("/");
});

app.get("/userHistory", ensureLogin, (req, res) => {
    res.render("userHistory", {
        layout: "main",
    });
});

app.use(function(req, res) {
    res.status(404).render("404");
});

blogService
    .initialize()
    .then(authData.initialize)
    .then(() => {
        app.listen(HTTP_PORT, function() {
            console.log(`Express http server listening on ${HTTP_PORT}`);
        });
    })
    .catch(function(rejectMsg) {
        console.log(rejectMsg);
    });