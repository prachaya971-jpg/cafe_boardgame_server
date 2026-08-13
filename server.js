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
const test = require('./test/test.js');
const borrow = require('./borrow/borrow.js')
const create = require('./create/create.js');
const variantModel = require('./report/report_varians.js');
const optionModel = require('./report/report_option.js');
const typeModel = require('./report/report_type.js');
const multer = require('multer');
const createboardgame = require('./boardgame/createboardgame.js');
const editboardgametype = require('./boardgame/edit_boardgame_type.js')

const app = express();
const path = require('path');
app.use(cors());
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/img/boardgame', express.static(path.join(__dirname, 'img')));
app.use('/img/options', express.static(path.join(__dirname, 'img/options')));
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
const storageoptions = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'img/options')); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});
const uploadptions = multer({ storage: storageoptions });

//authentication
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
    const authenRequest = req.body.authen_request;
    const result = await userAccountModel.CheckAuthenRequest(authenRequest);

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

//dashboard
app.get("/api/reports/revenue", checkAccessToken, async (req, res) => {
    const period = req.query.period || 'daily';     // 'daily', 'monthly', 'yearly'
    const category = req.query.category || 'all';   // 'all', 'food', 'boardgame'

    const result = await dashboard.getRevenueSummary(period, category);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(result));
});


app.get("/api/reports/order-count",checkAccessToken, async (req, res) => {
    try {

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




app.get("/api/dashboard/topproducts", checkAccessToken, async (req, res) => {
    try {

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

//variant
app.post("/api/food/create-variant", checkAccessToken, async (req, res) => {
    try {
        
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

app.get("/api/food/variants", checkAccessToken, async (req, res) => {
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

app.post("/api/food/update-variant",checkAccessToken, async (req, res) => {
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

app.post("/api/food/delete-variant",checkAccessToken, async (req, res) => {
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

//option
app.post("/api/food/create-option", uploadptions.single('options_img'), checkAccessToken, async (req, res) => {
    try {

        const option_name = req.body.option_name;
        const option_price = req.body.option_price;
        const options_img = req.file ? req.file.filename : null;

        
        let result = await create.createOption({ option_name, options_img, option_price });

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

app.get("/api/food/options", checkAccessToken, async (req, res) => {
    try {
        
        let result = await optionModel.getoption();

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

app.post("/api/food/update-option", checkAccessToken, uploadptions.single('options_img'), async (req, res) => {
    try {

        const { options_id, option_name, option_price } = req.body;
        const options_img = req.file ? req.file.filename : null;

        let result = await optionModel.updateOption({ 
            options_id, 
            option_name, 
            options_img, 
            option_price 
        });

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



app.post("/api/food/delete-option",checkAccessToken, async (req, res) => {
    try {
        const { option_id } = req.body;
        let result = await optionModel.deleteOption(option_id);

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

app.post("/api/food/create-type", checkAccessToken, async (req, res) => {
    try {
        
           const type_name = req.body.type_name
        

        
        let result = await create.createType({ type_name });

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

app.get("/api/food/types", checkAccessToken, async (req, res) => {
    try {
        
        let result = await typeModel.getType();

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

app.post("/api/food/update-type",checkAccessToken, async (req, res) => {
    try {
        const { food_type_id, food_type_name } = req.body;
        let result = await typeModel.updateType({ food_type_id, food_type_name });

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

app.post("/api/food/delete-type",checkAccessToken, async (req, res) => {
    try {
        const { food_type_id } = req.body;
        let result = await typeModel.deleteType(food_type_id);

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



//ยังไม่เสร็จ
app.get("/api/order/order-list", async (req, res) => {
    try {

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

app.post("/api/order/update-order-server", async (req, res) => {
    try {
    
        const { orderDetailId } = req.body;

        let result = await order.updateorderserver(orderDetailId);

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

app.get("/api/advice/advice-list", async (req, res) => {
    try {

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

app.post("/api/advice/update-advice", async (req, res) => {
    try {
    
        const { adviceId } = req.body;

        let result = await advice.updateadvice(adviceId);

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

app.listen(port, hostname, () => {
    console.log(`Server run is http://${hostname}:${port}/`);
});

// รายงานการยืมบอร์ดเกม
app.get("/api/reports/borrow-report", async (req, res) => {
    try {
        const { period} = req.query;

        let result = await borrow.getBorrowReportList(period); 
        
        res.json(result);
    } catch (err) {
        res.status(500).json({
            isError: true,
            data: [],
            errorMessage: err.message
        });
    }
});

//แก้ไขประเภทบอร์ดเกม
app.post("/api/boardgame/create-type", checkAccessToken, async (req, res) => {
    try {
           const boardgame_typename = req.body.boardgame_typename
        
        let result = await createboardgame.boardgamecreateType(boardgame_typename);

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

//แสดงประเภทบอร์ดเกม
app.get("/api/boardgame/report-type", checkAccessToken, async (req, res) => {
    try {
        
        let result = await editboardgametype.getType();

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

//แก้ไขประเภทบอร์ดเกม
app.post("/api/boardgame/update-type",checkAccessToken, async (req, res) => {
    try {
        const { boardgame_type_id, boardgame_type_name } = req.body;
        let result = await editboardgametype.updateType({ boardgame_type_id, boardgame_type_name });

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

//ลบประเภทบอร์ดเกม
app.post("/api/boardgame/delete-type",checkAccessToken, async (req, res) => {
    try {
        const { boardgame_type_id } = req.body;
        let result = await editboardgametype.deleteType(boardgame_type_id);

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
