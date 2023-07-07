const path = require("path");

const orders = require(path.resolve("src/data/orders-data"));

const nextId = require("../utils/nextId");


// Middleware Functions

function orderExists (req, res, next) {
    const { orderId } = req.params;
    const foundOrder = orders.find((order)=> order.id === orderId);

    if (foundOrder){
        res.locals.order = foundOrder;
        return next();
    }
    else {
        next({
            status: 404,
            message: `Order not found for id: ${orderId}`
        })
    }
}

function validateStatusProperty(req, res, next){
    const { status } = req.body.data;
    let message;
    if (!status || !status.length || (status !== "pending" && status !== "preparing" && status !== "out for delivery"))
    message = "Order must have a status of pending, preparing, out-for-delivery, delivered"
    else if(status === "delivered")
    message = "A delivered order cannot be changed"

    if (message) {
        return next({
            status: 400,
            message: message,
        })
    }
    next();
}

function validateOrderBody (req, res, next){
    const { data: { deliverTo, mobileNumber, dishes} = {} } = req.body;
    let message;
    if (!deliverTo || !deliverTo.length)
    message = `Order must include a deliverTo`;
    else if (!mobileNumber || !mobileNumber.length)
    message = "Order must include a mobileNumber";
    else if (!dishes)
    message = "Order must include a dish";
    else if(!Array.isArray(dishes) || !dishes.length)
    message = "Order must include one dish";
    else {
        dishes.forEach((dish, orderIdx)=>{
            if (!dish.quantity || dish.quantity <= 0 || !Number.isInteger(dish.quantity))
            message = `Dish ${orderIdx} must have a quantity that is an integer greater than 0`
        })
    }
    if (message) {
        return next({
            status: 400,
            message: message,
        })
    }
    next();
}

function validateOrderIds (req, res, next){
	const { orderId } = req.params;
	const { data: { id } } = req.body
    if (id && id !== orderId){
        return next({
            status: 400,
            message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`
        })
    }
    next();
}

function validateDelete(req, res, next){
    if (res.locals.order.status !== "pending") {
		return next({
			status: 400,
			message: "An order cannot be deleted unless it is pending",
		});
	}

	next();
}



//Route Handlers

function list(req, res){
    res.json({ data: orders})
};

function read(req, res){
    res.json ({ data: res.locals.order })
}

function create (req, res){
const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;
    const newOrder = {
        id: nextId(),
        deliverTo: deliverTo,
        mobileNumber: mobileNumber,
        status: status ? status : "pending",
        dishes: dishes
    }
    orders.push(newOrder);
    res.status(201).json({ data: newOrder })
}

function update(req, res){
    const { data: { deliverTo, mobileNumber, dishes, status } = {} } = req.body;

	res.locals.order = {
		id: res.locals.order.id,
		deliverTo: deliverTo,
		mobileNumber: mobileNumber,
		dishes: dishes,
		status: status,
	}

	res.json({ data: res.locals.order });
}

function destroy(req, res) {
    const orderIdx = orders.indexOf(res.locals.order);
    orders.splice(orderIdx, 1);
    res.sendStatus(204)
}

module.exports = {
    list, 
    read: [orderExists, read],
    create: [validateOrderBody, create],
    update: [orderExists, validateOrderIds, validateStatusProperty, validateOrderBody, update],
    destroy: [orderExists, validateDelete, destroy]
}