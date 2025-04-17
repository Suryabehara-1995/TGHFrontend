import React, { useState, useEffect } from "react";
import {
  Input,
  Button,
  message,
  Typography,
  Spin,
  Table,
  Checkbox,
  Tag,
} from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import axios from "axios";
import Cookies from "js-cookie";
import config from "../config.js";
import moment from "moment";

import "./PickingPage.css";

const { Search } = Input;
const { Title, Text } = Typography;

const PickingPage = ({ orders, userName, refetch }) => {
  const [searchText, setSearchText] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pickedItems, setPickedItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState(null); // Track start time

  // Set start time when an order is selected
  useEffect(() => {
    if (selectedOrder) {
      setStartTime(new Date());
    }
  }, [selectedOrder]);

  const handleSearch = (value) => {
    const trimmedValue = value.trim().toLowerCase();
    const order = orders.find(
      (o) =>
        (o.orderID.toLowerCase() === trimmedValue ||
          o.orderID.toLowerCase().includes(trimmedValue)) &&
        (!o.picked_status || o.picked_status === "Not Picked")
    );
    if (order) {
      setSelectedOrder(order);
      const initialPicked = {};
      order.products.forEach((_, index) => (initialPicked[index] = false));
      setPickedItems(initialPicked);
      setSearchText("");
    } else {
      message.error("Order not found or already picked");
    }
  };

  const handlePickToggle = (index) => {
    setPickedItems({ ...pickedItems, [index]: !pickedItems[index] });
  };

  const allPicked = Object.values(pickedItems).every((val) => val);

  const toggleSelectAll = () => {
    const newState = {};
    selectedOrder.products.forEach((_, index) => {
      newState[index] = !allPicked;
    });
    setPickedItems(newState);
  };

  const handlePickOrder = async (orderID) => {
    setLoading(true);
    const endTime = new Date(); // Track end time
    try {
      const response = await axios.post(
        `${config.apiBaseUrl}/pick-order`,
        {
          orderID,
          picked_person_name: userName,
          picked_date: new Date(),
          picked_time: moment().format("HH:mm:ss"),
          pickingActivity: {
            username: userName,
            orderID,
            products: selectedOrder.products.map((product) => ({
              name: product.name,
              sku: product.sku || "N/A",
              quantity: product.quantity,
            })),
            status: "Completed",
            startTime,
            endTime,
          },
        },
        {
          headers: { Authorization: `Bearer ${Cookies.get("token")}` },
        }
      );

      if (response.status === 200) {
        refetch(); // Refresh orders data
        setSelectedOrder(null);
        setStartTime(null); // Reset start time
        message.success(`Order ${orderID} marked as Picked by ${userName}`);
      }
    } catch (error) {
      console.error("Error picking order:", error);
      message.error("Failed to mark order as Picked");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedOrder(null);
    setStartTime(null); // Reset start time
  };

  return (
    <div className="picking-page-container">
      {!selectedOrder ? (
        <div className="search-mode">
          <Title level={2} className="search-title">
            Picking List
          </Title>
          <Search
            placeholder="Enter Order ID (e.g., S49640 or WH/OUT/15673-S49640#0-bfdde)"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={handleSearch}
            enterButton="Search"
            size="large"
            className="custom-search"
          />
        </div>
      ) : (
        <Spin spinning={loading}>
          <div className="order-view">
            <Button type="link" onClick={handleBack}>
              ← Back
            </Button>
            <Title level={3}>{selectedOrder.orderID}</Title>
            <Text strong>Customer:</Text> {selectedOrder.customer.name} <br />
            <Text strong>Email:</Text> {selectedOrder.customer.email}

            <div style={{ marginTop: 16, marginBottom: 8 }}>
              <Checkbox onChange={toggleSelectAll} checked={allPicked}>
                {allPicked ? "Unselect All" : "Select All"}
              </Checkbox>
            </div>

            <Table
              dataSource={selectedOrder.products.map((product, index) => ({
                key: index,
                name: product.name,
                sku: product.sku || "N/A",
                quantity: product.quantity,
                picked: pickedItems[index],
                index,
              }))}
              columns={[
                {
                  title: "",
                  dataIndex: "checkbox",
                  render: (_, record) => (
                    <Checkbox
                      checked={record.picked}
                      onChange={() => handlePickToggle(record.index)}
                    />
                  ),
                  width: 50,
                },
                {
                  title: "Product Name",
                  dataIndex: "name",
                  render: (text, record) => (
                    <span className={record.picked ? "striked" : ""}>
                      {text}
                    </span>
                  ),
                },
                {
                  title: "SKU",
                  dataIndex: "sku",
                  render: (sku) => (
                    <Tag
                      color="Red"
                      style={{ fontWeight: "bold", textAlign: "center" }}
                    >
                      {sku}
                    </Tag>
                  ),
                },
                {
                  title: "Quantity",
                  dataIndex: "quantity",
                  render: (qty) => (
                    <Tag
                      color="Red"
                      style={{ fontWeight: "bold", textAlign: "center" }}
                    >
                      {qty}
                    </Tag>
                  ),
                },
                {
                  title: "Picked",
                  dataIndex: "picked",
                  render: (picked) =>
                    picked ? (
                      <CheckCircleOutlined style={{ color: "green" }} />
                    ) : (
                      <CloseCircleOutlined style={{ color: "gray" }} />
                    ),
                },
              ]}
              pagination={false}
              bordered
              style={{ marginTop: 16 }}
            />

            <div className="footer-action" style={{ marginTop: 20 }}>
              <Button
                type="primary"
                size="large"
                onClick={() => handlePickOrder(selectedOrder.orderID)}
                disabled={!allPicked || loading}
              >
                Mark as Picked
              </Button>
            </div>
          </div>
        </Spin>
      )}
    </div>
  );
};

export default PickingPage;