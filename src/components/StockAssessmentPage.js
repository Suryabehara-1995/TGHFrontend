import React, { useEffect, useState } from "react";
import axios from "axios";
import { Table, Spin, Button, message } from "antd";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import config from "../config"; // Import the config file

const StockAssessmentPage = () => {
  const [loading, setLoading] = useState(true);
  const [stockData, setStockData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [orderCount, setOrderCount] = useState(0); // State for today's order count
  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      navigate("/");
      return;
    }
    const fetchStockData = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/all-orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const orders = response.data.orders || [];

        // Filter orders for today based on order_date
        const today = moment().startOf("day");
        const todayOrders = orders.filter((order) => {
          if (!order.order_date) {
            console.warn(`[StockAssessment] Order ${order.orderID} has no order_date`);
            return false;
          }
          const orderDate = moment(order.order_date);
          const isToday = orderDate.isSame(today, "day");
          return isToday;
        });

        if (todayOrders.length === 0) {
          message.info("No orders found for today.");
          console.log(`[StockAssessment] No orders for ${today.format("YYYY-MM-DD")}`);
        } else {
          console.log(`[StockAssessment] Found ${todayOrders.length} orders for ${today.format("YYYY-MM-DD")}`);
        }

        // Aggregate quantities by product
        const productData = {};
        todayOrders.forEach((order, orderIndex) => {
          if (!order.products || !Array.isArray(order.products)) {
            console.warn(`[StockAssessment] Order ${order.orderID} has no valid products array`);
            return;
          }
          order.products.forEach((product) => {
            const productName = product.name || "Unknown Product";
            const quantity = Number(product.quantity) || 0;
            const sku = product.sku || "N/A";

            if (productData[productName]) {
              productData[productName].quantity += quantity;
            } else {
              productData[productName] = {
                quantity: quantity,
                sku: sku,
              };
            }
          });
        });

        console.log("[StockAssessment] Aggregated product data:", productData);

        // Convert to array for table
        const stockArray = Object.entries(productData).map(([name, data], index) => ({
          key: index + 1,
          sno: index + 1,
          productName: name,
          sku: data.sku,
          orderedQuantity: data.quantity,
        }));

        stockArray.sort((a, b) => b.orderedQuantity - a.orderedQuantity);

        if (stockArray.length === 0) {
          console.log("[StockAssessment] No products aggregated for today.");
        }

        setStockData(stockArray);
        setFilteredData(stockArray);
        setOrderCount(todayOrders.length);
      } catch (error) {
        console.error("[StockAssessment] Failed to fetch stock data:", error);
        if (error.response?.status === 401) {
          Cookies.remove("token");
          navigate("/");
        }
        message.error("Failed to load stock data.");
      } finally {
        setLoading(false);
      }
    };
    fetchStockData();
  }, [navigate]);

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Assessment");
    XLSX.writeFile(workbook, `StockAssessment_${moment().format("YYYY-MM-DD")}.xlsx`);
  };

  const columns = [
    {
      title: "S.No",
      key: "sno",
      align: "center",
      render: (text, record, index) => index + 1,
    },
    {
      title: "Product Name",
      dataIndex: "productName",
      key: "productName",
    },
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
    },
    {
      title: "Ordered Quantity",
      dataIndex: "orderedQuantity",
      key: "orderedQuantity",
      align: "center",
      sorter: (a, b) => a.orderedQuantity - b.orderedQuantity,
      defaultSortOrder: "descend",
    },
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Spin size="large" tip="Loading Stock Assessment..." />
      </div>
    );
  }

  return (
    <div style={{ padding: "15px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "10px" }}>
        Stock Assessment for {moment().format("DD/MM/YYYY")}
      </h1>
      <p style={{ fontSize: "16px", color: "#555", marginBottom: "20px" }}>
        Showing total quantities ordered today
      </p>

      {/* Export Buttons and Order Count */}
      <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
        <Button type="default" onClick={exportToExcel}>
          Export to Excel
        </Button>
      
       
        <div
          style={{
            marginLeft: "auto",
            fontSize: "18px",
            fontWeight: "bold",
            background: "#e6f7ff",
            padding: "8px 16px",
            borderRadius: "4px",
          }}
        >
          Today's Orders: {orderCount}
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredData}
        bordered
        pagination={{ pageSize: 50 }}
        style={{ background: "#fff", borderRadius: "12px" }}
        locale={{ emptyText: "No products ordered today" }}
      />
    </div>
  );
};

export default StockAssessmentPage;