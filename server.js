const http = require('http');
const bp = require('body-parser');
const express = require('express');
const userAccountModel = require('./models/user_account');
const jwt = require('./libs/jwt');
const dateUtils = require('./libs/date_utils');
const { isErrored } = require('stream');
const { error } = require('console');
const cors = require('cors');
const dashboard = require('./dashboard/dashboard.js');
const advice = require('./advice/advice.js');
const order = require('./order/order.js');
const create = require('./create/create.js');
const variantModel = require('./report/report_varians.js');
const multer = require('multer');

const app = express();
const path = require('path');
app.use(cors());
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use(express.json());

app.use(bp.urlencoded({ extended: true }));
app.use(bp.json());
const hostname = '127.0.0.1';
const port = 3000;

const checkAccessToken = (req, res, next) => {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    } else {
        token = req.body.token;
    }

    jwt.verify(token)
        .then((decoded) => {
            req.decoded = decoded;
            next();
        }, (err) => {
            res.json({
                isError: false,
                result: false,
                errorMessage: "ยังไม่ได้เข้าสู่ระบบ"
            });
        });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'img/variants')); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});
const upload = multer({ storage: storage });


app.get("/api/users", (req, res) => {
    var response = {
        isError: true,
        data: "You are unauthorized for this data"
    };
    res.send(JSON.stringify(response));
});

app.get("/api/users/:accountId", async (req, res) => {
    const accountId = req.params.accountId;
    const response = await userAccountModel.getUserAccountById(accountId);
    res.send(JSON.stringify(response));
});

app.post("/api/authen/authen_request", async (req, res) => {
    console.log(req.body.authen_request)
    const authenRequest = req.body.authen_request;
    const result = await userAccountModel.CheckAuthenRequest(authenRequest);
    console.log(result);

    let response;

    if (result.isError) {
        response = { isError: true, data: "", errorMessage: result.errorMessage };
    } else {
        var payload = { username: result.data[0].user_id }
        const authenToken = jwt.sign(payload);
        response = {
            isError: false,
            data: authenToken,
            errorMessage: ""
        }
    }
    res.send(JSON.stringify(response));
});

app.post("/api/authen/access_request", async (req, res) => {

    const authenSignature = req.body.authen_signature;
    const authenToken = req.body.authen_token;


    var decoded = await jwt.verify(authenToken).catch(() => null);

    let response;

    if (decoded) {
        const result = await userAccountModel.checkAccesRequest(authenSignature, authenToken);
        console.log(result);

        if (result.isError) {
            response = { isError: true, data: "", errorMessage: result.errorMessage };
        } else {
            var payload = {
                emp_id: result.data[0].emp_id,
                user_id: result.data[0].user_id,
                emp_name: result.data[0].emp_first_name,
                emp_role_id: result.data[0].emp_role_id,
                date: dateUtils.getCurrentDateForToken()
            };

            const accessToken = jwt.sign(payload);
            response = {
                isError: false,
                data: {
                    access_token: accessToken,
                },
                errorMessage: ""
            }
        }
    } else {
        response = {
            isError: true,
            data: "",
            errorMessage: "ข้อมูลไม่ถูกต้อง"
        };
    }
    res.send(JSON.stringify(response));
})


app.get("/api/reports/revenue", checkAccessToken, async (req, res) => {
    console.log("reports/revenue");
     console.log(req.decoded);
    const period = req.query.period || 'daily';     // 'daily', 'monthly', 'yearly'
    const category = req.query.category || 'all';   // 'all', 'food', 'boardgame'

    const result = await dashboard.getRevenueSummary(period, category);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(result));
});


app.get("/api/reports/order-count",checkAccessToken, async (req, res) => {
    try {
        console.log("reports/order-count");
        console.log(req.decoded);
        let result = await dashboard.getOrderCountSummary();
        res.json(result);
    } catch (err) {
        res.status(500).json({
            isError: true,
            data: { total_orders: 0 },
            errorMessage: err.message
        });
    }
});

app.get("/api/reports/advice-count", checkAccessToken, async (req, res) => {
    try {

        console.log("reports/advice-count");
        console.log(req.decoded);

        let result = await dashboard.getadviceCountSummary();
        res.json(result);
    } catch (err) {
        res.status(500).json({
            isError: true,
            data: { total_advice: 0 },
            errorMessage: err.message
        });
    }
});

app.get("/api/reports/borrow-count", checkAccessToken, async (req, res) => {
    try {
        console.log("reports/borrow-count");
        console.log(req.decoded);
        let result = await dashboard.getborrowCountSummary();
        res.json(result);
    } catch (err) {
        res.status(500).json({
            isError: true,
            data: { total_borrows: 0 },
            errorMessage: err.message
        });
    }
});

app.get("/api/reports/revenue-chart", checkAccessToken, async (req, res) => {
    try {
        console.log("reports/revenue-chart");
        console.log(req.decoded);
        const { period = 'daily', category = 'all' } = req.query;
        let result = await dashboard.getRevenueChartData(period, category);
        res.json(result);
    } catch (err) {
        res.status(500).json({ isError: true, 
            data: [], 
            errorMessage: err.message 
        });
    }
});

app.get("/api/advice/advice-list",checkAccessToken, async (req, res) => {
    try {
        console.log("order/advice-list");
        console.log(req.decoded);

        let result = await advice.getadviceList();
        
        res.json(result);
    } catch (err) {
        res.status(500).json({
            isError: true,
            data: [],
            errorMessage: err.message
        });
    }
});



app.get("/api/dashboard/topproducts", checkAccessToken, async (req, res) => {
    try {
        console.log("dashboard/topproducts");
        console.log(req.decoded);
        const { period, category, limit } = req.query;

        let result = await dashboard.gettopproducts(period, category, limit);

        res.json(result);
    } catch (err) {
        res.status(500).json({
            isError: true,
            data: [],
            errorMessage: err.message
        });
    }
});

app.post("/api/food/create-variant", checkAccessToken, async (req, res) => {
    try {
        console.log("food/create-variant");
        console.log(req.decoded);
        
           const variant_name = req.body.variant_name
        

        
        let result = await create.createVariant({ variant_name });

        if (result.isError) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (err) {
        res.status(500).json({
            isError: true,
            data: [],
            errorMessage: err.message
        });
    }
});

app.get("/api/food/variants", async (req, res) => {
    try {
        let result = await variantModel.getvarians();

        if (result.isError) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (err) {
        res.status(500).json({
            isError: true,
            data: [],
            errorMessage: err.message
        });
    }
});

app.post("/api/food/update-variant", async (req, res) => {
    try {
        const { variant_id, variant_name } = req.body;
        let result = await variantModel.updateVariant({ variant_id, variant_name });

        if (result.isError) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({
            isError: true,
            data: null,
            errorMessage: err.message
        });
    }
});

app.post("/api/food/delete-variant", async (req, res) => {
    try {
        const { variant_id } = req.body;
        let result = await variantModel.deleteVariant(variant_id);

        if (result.isError) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (err) {
        res.status(500).json({
            isError: true,
            data: null,
            errorMessage: err.message
        });
    }
});

app.get("/api/order/order-list", async (req, res) => {
    try {
        //console.log("order/order-list");
        //console.log(req.decoded);
        

        let result = await order.getorderList();

        res.json(result);
    } catch (err) {
        res.status(500).json({
            isError: true,
            data: [],
            errorMessage: err.message
        });
    }
});






app.listen(port, hostname, () => {
    console.log(`Server run is http://${hostname}:${port}/`);
});