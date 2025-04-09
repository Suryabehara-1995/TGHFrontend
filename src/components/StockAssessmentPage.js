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
  const [orderCount, setOrderCount] = useState(0); // New state for order count
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

        // Calculate total quantity for each product for today's orders
        const today = moment().startOf("day");
        const todayOrders = orders.filter((order) =>
          moment(order.shiprocketDate).isSame(today, "day")
        );

        const productData = {};
        todayOrders.forEach((order) => {
          order.products.forEach((product) => {
            if (productData[product.name]) {
              productData[product.name].quantity += product.quantity;
            } else {
              productData[product.name] = {
                quantity: product.quantity,
                sku: product.sku, // Include SKU in the product data
              };
            }
          });
        });

        // Convert productData object to an array for the table
        const stockArray = Object.entries(productData).map(([name, data], index) => ({
          key: index + 1,
          sno: index + 1,
          productName: name,
          sku: data.sku, // Add SKU to the table data
          orderedQuantity: data.quantity,
        }));

        // Sort by highest quantity by default
        stockArray.sort((a, b) => b.orderedQuantity - a.orderedQuantity);

        setStockData(stockArray);
        setFilteredData(stockArray); // Initially, show today's data
        setOrderCount(todayOrders.length); // Set the order count for today
      } catch (error) {
        console.error("Failed to fetch stock data", error);
        if (error.response?.status === 401) {
          Cookies.remove("token");
          navigate("/");
        }
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
    XLSX.writeFile(workbook, "StockAssessment.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF(); // Create a new jsPDF instance
    doc.text("Stock Assessment", 14, 10); // Add a title to the PDF
    doc.autoTable({
      head: [["S.No", "Product Name", "SKU", "Ordered Quantity"]], // Table headers
      body: filteredData.map((item) => [item.sno, item.productName, item.sku, item.orderedQuantity]), // Table data
    });
    doc.save("StockAssessment.pdf"); // Save the PDF
  };

  const columns = [
    {
      title: "S.No",
      key: "sno",
      align: "center",
      render: (text, record, index) => index + 1, // Dynamically generate serial numbers
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
      sorter: (a, b) => a.orderedQuantity - b.orderedQuantity, // Enable sorting by quantity
      defaultSortOrder: "descend", // Default to descending order
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
    <div style={ {padding :'15px'}}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>Today's Stock Assessment</h1>

      {/* Export Buttons and Order Count */}
      <div style={{ marginBottom: "20px", display: "flex", alignItems: "center" }}>
        <Button type="default" onClick={exportToExcel} style={{ marginRight: "10px" }}>
          Export to Excel
        </Button>
    
        <div style={{ marginLeft: "auto", fontSize: "16px", fontWeight: "bold" }}>
          Total Orders: {orderCount}
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={filteredData}
        bordered
        pagination={{ pageSize: 50 }}
        style={{ background: "#fff", borderRadius: "12px" }}
      />
    </div>
  );
};

export default StockAssessmentPage;