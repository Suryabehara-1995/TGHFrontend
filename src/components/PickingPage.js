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
  Image,
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
  const [startTime, setStartTime] = useState(null);

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
    const endTime = new Date();
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
        refetch();
        setSelectedOrder(null);
        setStartTime(null);
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
    setStartTime(null);
  };

  // // Sort products by productLocation in ascending order (e.g., 1a to 10a)
  // const sortedProducts = selectedOrder
  //   ? [...selectedOrder.products].sort((a, b) => {
  //       const locA = a.productLocation?.toLowerCase() || "";
  //       const locB = b.productLocation?.toLowerCase() || "";
  //       const numA = parseInt(locA.replace(/\D/g, "")) || 0;
  //       const numB = parseInt(locB.replace(/\D/g, "")) || 0;
  //       const charA = locA.replace(/\d/g, "");
  //       const charB = locB.replace(/\d/g, "");
  //       if (charA === charB) {
  //         return numA - numB; // Sort by number if letters are the same
  //       }
  //       return charA.localeCompare(charB); // Otherwise sort by letter
  //     })
  //   : [];

   const sortedProducts = selectedOrder
    ? [...selectedOrder.products].sort((a, b) => {
        const parseLocation = (loc) => {
          const cleaned = (loc || "").toLowerCase().trim();
          const match = cleaned.match(/^(\d+)([a-z]*)$/);
          if (!match) return { rack: 0, section: "" };
          return {
            rack: parseInt(match[1], 10),
            section: match[2] || "",
          };
        };
        const aLoc = parseLocation(a.productLocation);
        const bLoc = parseLocation(b.productLocation);

        if (aLoc.rack === bLoc.rack) {
          return aLoc.section.localeCompare(bLoc.section);
        }
        return aLoc.rack - bLoc.rack;
      })
    : [];

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
              dataSource={sortedProducts.map((product, index) => ({
                key: index,
                name: product.name,
                sku: product.sku || "N/A",
                quantity: product.quantity,
                picked: pickedItems[index],
                index,
                imageUrl: product.imageUrl || "",
                productLocation: product.productLocation || "Unknown",
                productCategory: product.productCategory || "Unknown",
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
                  title: "Image",
                  dataIndex: "imageUrl",
                  render: (url) => (
                    <Image
                      src={url || "https://via.placeholder.com/50"}
                      alt="Product"
                      width={50}
                      height={50}
                      style={{ objectFit: "cover" }}
                      preview={true}
                      fallback="https://via.placeholder.com/50"
                    />
                  ),
                  width: 60,
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
                      color={sku && sku.toLowerCase().startsWith("1kg") ? "red" : "blue"}
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
                      color={qty > 1 ? "red" : "blue"}
                      style={{ fontWeight: "bold", textAlign: "center" }}
                    >
                      {qty}
                    </Tag>
                  ),
                },
                {
                  title: "Location",
                  dataIndex: "productLocation",
                  render: (loc) => (
                    <Tag color="cyan" style={{ fontWeight: "bold" }}>
                      {loc}
                    </Tag>
                  ),
                },
                {
                  title: "Category",
                  dataIndex: "productCategory",
                  render: (cat) => (
                    <Tag color="purple" style={{ fontWeight: "bold" }}>
                      {cat}
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
