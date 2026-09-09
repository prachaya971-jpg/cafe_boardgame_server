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
const create = require('./create/createfood.js');
const variantModel = require('./report/report_varians.js');
const optionModel = require('./report/report_option.js');
const typeModel = require('./report/report_type.js');
const salereport = require('./salereport/salereport.js');
const multer = require('multer');
const createboardgame = require('./borrow/createboardgame.js');
const editboardgametype = require('./borrow/edit_boardgame_type.js');
const borrow = require('./borrow/borrow.js');
const foodModel = require('./report/report_food.js');
const empModel = require('./emp/emp.js')
const tableModel = require('./table/table.js')
const resetpassModel = require('./models/resetpass.js');

const app = express();
const path = require('path');
app.use(cors());
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/img/options', express.static(path.join(__dirname, 'img/options')));

app.use(express.json());

app.use(bp.urlencoded({ extended: true }));
app.use(bp.json());
const hostname = '0.0.0.0';
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

const empstorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'img/emp')); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'emp-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploademp = multer({ storage: empstorage });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'img/food')); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'food-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

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
                password_status_id: result.data[0].password_status_id,
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

//variant
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

app.get("/api/food/variants", checkAccessToken, async (req, res) => {
    try {

        console.log("food/variants");
        console.log(req.decoded);
        
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
        console.log("food/update-variant");
        console.log(req.decoded);
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
        console.log("food/delete-variant");
        console.log(req.decoded);
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
        console.log("food/create-option");
        console.log(req.decoded);

        const option_name = req.body.option_name;
        const option_price = req.body.option_price;
        const options_img = req.file ? req.file.filename : null;
        const food_status_id = req.body.food_status_id;

        
        let result = await create.createOption({ option_name, options_img, option_price, food_status_id });

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

        console.log("food/options");
        console.log(req.decoded);
        
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
        console.log("food/update-option");
        console.log(req.decoded);

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
        console.log("food/delete-option");
        console.log(req.decoded);
        const { options_id } = req.body;
        let result = await optionModel.deleteOption(options_id);

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

//type
app.post("/api/food/create-type", checkAccessToken, async (req, res) => {
    try {
        console.log("food/create-type");
        console.log(req.decoded);
        
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

        console.log("food/types");
        console.log(req.decoded);
        
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
        console.log("food/update-type");
        console.log(req.decoded);
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
        console.log("food/delete-type");
        console.log(req.decoded);
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




app.get("/api/order/order-list", checkAccessToken, async (req, res) => {
    try {
        console.log("order/order-list");
        console.log(req.decoded);
        

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

app.post("/api/order/update-order-server",checkAccessToken, async (req, res) => {
    try {
        console.log("order/update-order-server");
        console.log(req.decoded);

        const { orderDetailId,orderstatus } = req.body;

        let result = await order.updateorderserver(orderDetailId,orderstatus);

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

app.get("/api/advice/advice-list", checkAccessToken, async (req, res) => {
    try {

        console.log("advice/advice-list");
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

app.post("/api/advice/update-advice", checkAccessToken, async (req, res) => {
    try {
        console.log("advice/update-advice");
        console.log(req.decoded);

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



app.get("/api/salereport/salereport",checkAccessToken, async (req, res) => {
    try {

        console.log("salereport/salereport");
        console.log(req.decoded);
        const { date } = req.query; 
        let result = await salereport.getsalereport(date);
        res.json(result);
    } catch (err) {
        res.status(500).json({
            isError: true,
            data: [],
            errorMessage: err.message
        });
    }
});

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

        console.log("boardgame/report-type");
        console.log(req.decoded);
        
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
        console.log("boardgame/delete-type");
        console.log(req.decoded);
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

app.post("/api/food/update-option-status", checkAccessToken, async (req, res) => {
    try {
        const { options_id, food_status_id } = req.body;
        const result = await optionModel.updatestatus({ options_id, food_status_id });

        if (result.isError) {
            return res.status(400).json(result);
        }
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({
            isError: true,
            data: null,
            errorMessage: err.message
        });
    }
});

app.post("/api/food/update-food-status", checkAccessToken, async (req, res) => {
    try {
        const { food_variant_id, food_status_id } = req.body;
        const result = await foodModel.updatestatusfood({ food_variant_id, food_status_id });

        if (result.isError) {
            return res.status(400).json(result);
        }
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({
            isError: true,
            data: null,
            errorMessage: err.message
        });
    }
});

// create food
app.post("/api/food/create-food", checkAccessToken, upload.single('img_food_url'), async (req, res) => {
    try {
        console.log("food/create-food");
        console.log(req.decoded);

        const foodName = req.body.food_name;
        const foodTypeId = req.body.food_type_id;
        
        let variants = [];
        if (typeof req.body.variants === 'string') {
            variants = JSON.parse(req.body.variants);
        } else {
            variants = req.body.variants || [];
        }

        // 2. จัดการรูปภาพ
        if (req.file && variants.length > 0) {
            variants[0].img_food_url = req.file.filename;
        }

        const foodData = {
            food_name: foodName,
            food_type_id: foodTypeId,
            variants: variants
        };

        const result = await create.createFood(foodData);

        if (result.isError) {
            return res.status(400).json(result);
        }

        res.status(201).json(result);

    } catch (err) {
        console.error("Error create food:", err);
        res.status(500).json({
            isError: true,
            data: null,
            errorMessage: err.message
        });
    }
});
app.get("/api/food/food-status",checkAccessToken, async (req, res) => {
    try {
        let result = await create.getstatusfood();
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
app.post("/api/food/update-foodvariant", checkAccessToken, upload.single('img_food_url'), async (req, res) => {
    try {
        console.log("food/update-foodvariant");
        console.log(req.decoded);

        const foodId = req.body.food_id;
        const foodVariantId = req.body.food_variant_id;
        const foodName = req.body.food_name;
        const foodTypeId = req.body.food_type_id;
        const foodVariantPrice = req.body.food_variant_price;

        let optionIds = [];
        if (typeof req.body.option_ids === 'string') {
            optionIds = JSON.parse(req.body.option_ids);
        } else {
            optionIds = req.body.option_ids || [];
        }

        let imgFoodUrl = null;
        if (req.file) {
            imgFoodUrl = req.file.filename;
        }

        const foodData = {
            food_id: foodId,
            food_variant_id: foodVariantId,
            food_name: foodName,
            food_type_id:foodTypeId,
            food_variant_price: foodVariantPrice,
            option_ids: optionIds,
            img_food_url: imgFoodUrl
        };

        const result = await foodModel.updateVariant(foodData);

        if (result.isError) {
            return res.status(400).json(result);
        }

        res.status(200).json(result);

    } catch (err) {
        console.error("Error update food variant:", err);
        res.status(500).json({
            isError: true,
            data: null,
            errorMessage: err.message
        });
    }
});

app.get("/api/food/food", async (req, res) => {
    try {

        //console.log("food/food");
        //console.log(req.decoded);
        
        let result = await foodModel.getfood();

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

app.post("/api/food/delete-food", async (req, res) => {
    try {
        //console.log("boardgame/delete-type");
        //console.log(req.decoded);
        const { food_id, food_variant_id } = req.body;
        let result = await foodModel.deletefood(food_id,food_variant_id);

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


app.get("/api/emp/emp", async (req, res) => {
    try {

        //console.log("food/food");
        //console.log(req.decoded);
        
        let result = await empModel.getemp();

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

app.get("/api/emp/emp-role", async (req, res) => {
    try {

        //console.log("food/emp-role");
        //console.log(req.decoded);
        
        let result = await empModel.getemprole();

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

app.post("/api/emp/update-emp-status", async (req, res) => {
    try {
        const { emp_id, new_temp_password } = req.body;

        let result = await empModel.updateempstatus(emp_id, new_temp_password);

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

app.post("/api/emp/delete-emp", async (req, res) => {
    try {
        //console.log("food/delete-option");
        //console.log(req.decoded);
        const { emp_id } = req.body;
        let result = await empModel.deleteemp(emp_id);

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

app.post("/api/emp/update-emp-newstatus", async (req, res) => {
    try {
        //console.log("/api/emp/update-emp-newstatus");
        //console.log(req.decoded);
        const { emp_id } = req.body;
        const { emp_status_id } = req.body;
        let result = await empModel.updatenewempstatus(emp_id, emp_status_id);

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

app.post("/api/emp/update-emp", checkAccessToken, uploademp.single("img_emp"), async (req, res) => {
    try {
        const { emp_id, emp_first_name, emp_last_name, age, tel, sex, emp_role_id } = req.body;
        const img_emp = req.file ? req.file.filename : null;

        const result = await empModel.updateemp({
            emp_id,
            emp_first_name,
            emp_last_name,
            age,
            tel,
            sex,
            emp_role_id,
            img_emp
        });

        if (result.isError) {
            return res.status(400).json(result);
        }
        return res.status(200).json(result); 
    } catch (err) {
        console.error("Error update emp:", err);
        return res.status(500).json({
            isError: true,
            data: null,
            errorMessage: err.message
        });
    }
});

app.post("/api/emp/reset-password-status", async (req, res) => {
    try {
        const { emp_id, new_password } = req.body;

        let result = await resetpassModel.resetpassword(emp_id, new_password);

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

app.post("/api/emp/create-emp", uploademp.single("img_emp"), async (req, res) => {
    try {
        const { user_id, emp_first_name, emp_last_name, age, tel, sex, emp_role_id, password} = req.body;
        const img_emp = req.file ? req.file.filename : null;

        const result = await empModel.createemp({
            user_id,
            emp_first_name,
            emp_last_name,
            password,
            age,
            tel,
            sex,
            emp_role_id,
            img_emp
        });

        if (result.isError) {
            return res.status(400).json(result);
        }
        return res.status(200).json(result); 
    } catch (err) {
        console.error("Error update emp:", err);
        return res.status(500).json({
            isError: true,
            data: null,
            errorMessage: err.message
        });
    }
});

app.get('/api/emp/generate-id', async (req, res) => {
  try {
    const result = await empModel.generateuserid();

    if (result.isError) {
      return res.status(500).json({
        status: false,
        message: result.errorMessage || 'เกิดข้อผิดพลาดในการสร้างรหัสพนักงาน',
      });
    }
    return res.status(200).json({
      status: true,
      emp_id: result.data.emp_id,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
});


app.post("/api/table/create-table", async (req, res) => {
    try {
       // console.log("table/create-table");
        //console.log(req.decoded);

        let result = await tableModel.createtable();

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

app.get("/api/table/table", async (req, res) => {
    try {
       // console.log("table/create-table");
        //console.log(req.decoded);

        let result = await tableModel.gettable();

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

app.post("/api/table/delete-table", async (req, res) => {
    try {
       // console.log("table/create-table");
        //console.log(req.decoded);

        let result = await tableModel.deletetable();

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



app.get("/api/test", async (req, res) => {
    console.log("5555");
    res.json({ message: "5555" });
});
app.listen(port, hostname, () => {
    console.log(`Server running at port ${port}`);
});