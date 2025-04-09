import React, { useState, useEffect } from "react";
import { Table, Button, DatePicker, message, Spin } from "antd";
import * as XLSX from "xlsx";
import moment from "moment";
import config from "../config";
const { RangePicker } = DatePicker;

const OrderSync = () => {
  const [orders, setOrders] = useState([]);
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 10; // Number of orders per page

  useEffect(() => {
    if (orders.length > 0) setPage(1);
  }, [orders]);

  const fetchOrders = async () => {
    if (!dates.length) {
      message.warning("⚠ Please select both From and To dates.");
      return;
    }

    setLoading(true);
    message.loading({ content: "Fetching orders...", key: "fetching" });

    try {
      const fromDate = moment(dates[0]).format("YYYY-MM-DD");
      const toDate = moment(dates[1]).format("YYYY-MM-DD");

      const response = await fetch(`${config.apiBaseUrl}/shiprocket-orders?from=${fromDate}&to=${toDate}`);
      const data = await response.json();

      console.log("Full API Response:", data);

      if (Array.isArray(data.orders) && data.orders.length > 0) {
        setTotalOrders(data.orders.length);

        const processedOrders = data.orders.map(order => {
          return {
            key: order.channel_order_id || `TEMP-${Date.now()}`,
            orderID: order.channel_order_id || `TEMP-${Date.now()}`,
            order_date: order.created_at || "Unknown Date",
            customer: {
              name: order.customer_name || "Unknown",
              mobile: order.customer_phone || "Unknown",
              email: order.customer_email || "Unknown"
            },
            shipments: Array.isArray(order.shipments) ? order.shipments.map(shipment => ({
              courier_name: shipment.sr_courier_name || "N/A",
              awb_code: shipment.pickup_token_number || "N/A"
            })) : [],
            products: Array.isArray(order.products) ? order.products.map(product => {
              // Extract weight from channel_sku if available
              const weightMatch = product.channel_sku?.match(/(\d+)(g|kg)/i); // Match weight in SKU
              const weight = weightMatch ? parseFloat(weightMatch[1]) / (weightMatch[2].toLowerCase() === "kg" ? 1 : 1000) : "Unknown Weight";

              return {
                id: product.id || `TEMP-PROD-${Date.now()}`,
                updated_id: product.product_id || `TEMP-UPD-${Date.now()}`,
                sku: product.channel_sku || "Unknown SKU",
                name: product.name || "Unknown Item",
                quantity: product.quantity || 0,
                weight: weight // Bind the extracted weight
              };
            }) : [],
            packed_status: order.packed_status || "Not Completed",
            packed_date: order.packed_date || "Unknown Date",
            packed_time: order.packed_time || "Unknown Time",
            packed_person_name: order.packed_person_name || "Unknown",
            warehouse_out: order.warehouse_out || "Unknown",
            warehouse_out_date: order.warehouse_out_date || "Unknown Date",
            warehouse_out_time: order.warehouse_out_time || "Unknown Time"
          };
        });

        setOrders(processedOrders);
        message.success({ content: `✅ ${processedOrders.length} orders fetched successfully!`, key: "fetching" });
      } else {
        setOrders([]);
        setTotalOrders(0);
        message.warning("⚠ No valid orders found.");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      message.error("❌ Failed to fetch orders.");
    } finally {
      setLoading(false);
    }
  };

  const uploadOrdersToMongoDB = async () => {
    if (orders.length === 0) {
      message.warning("⚠ No orders to upload.");
      return;
    }

    setLoading(true);
    message.loading({ content: "Uploading orders...", key: "uploading" });

    try {
      const fromDate = moment(dates[0]).format("YYYY-MM-DD");
      const toDate = moment(dates[1]).format("YYYY-MM-DD");

      const response = await fetch(`${config.apiBaseUrl}/sync-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromDate, to: toDate, orders })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      message.success({ content: `✅ ${result.insertedCount || 0} orders uploaded successfully!`, key: "uploading" });
    } catch (error) {
      console.error("Error uploading orders:", error);
      message.error(`❌ Failed to upload orders: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    const productData = orders.flatMap(order => order.products.map(product => ({
      orderID: order.orderID,
      productID: product.updated_id,
      sku: product.sku, // Include SKU in the Excel file
      productName: product.name,
      quantity: product.quantity,
      weight: product.weight // Include weight in the Excel file
    })));

    const worksheet = XLSX.utils.json_to_sheet(productData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    XLSX.writeFile(workbook, "products.xlsx");
  };

  const columns = [
    { title: "Order ID", dataIndex: "orderID", key: "orderID" },
    { title: "Order Date", dataIndex: "order_date", key: "order_date" },
    {
      title: "Customer",
      dataIndex: "customer",
      key: "customer",
      render: customer => (
        <div>
          <div><b>Name:</b> {customer?.name || "Unknown"}</div>
          <div><b>Mobile:</b> {customer?.mobile || "Unknown"}</div>
          <div><b>Email:</b> {customer?.email || "Unknown"}</div>
        </div>
      )
    },
    {
      title: "Products",
      dataIndex: "products",
      key: "products",
      render: products => (
        <ul>
          {products.map((product, index) => (
            <li key={index}>
              <b>Name:</b> {product.name}, <b>Qty:</b> {product.quantity}, <b>SKU:</b> {product.sku}, <b>Weight:</b> {product.weight} kg
            </li>
          ))}
        </ul>
      )
    },
    { title: "Packed Status", dataIndex: "packed_status", key: "packed_status" }
  ];

  return (
    <div style={{ padding: 20 }}>
      <RangePicker onChange={setDates} style={{ marginBottom: 10 }} />
      <div style={{ marginBottom: 15 }}>
        <Button onClick={fetchOrders} loading={loading} type="primary" style={{ marginRight: 10 }}>
          📥 Fetch Orders
        </Button>
        <Button onClick={uploadOrdersToMongoDB} disabled={loading || orders.length === 0} type="dashed" style={{ marginRight: 10 }}>
          📤 Upload to MongoDB
        </Button>
        <Button onClick={downloadExcel} disabled={orders.length === 0} type="default">
          📥 Download Excel
        </Button>
      </div>
      {loading ? <Spin size="large" /> : <Table columns={columns} dataSource={orders} pagination={{ pageSize: perPage }} />}
      <p>Total Orders: {totalOrders}</p>
    </div>
  );
};

export default OrderSync;