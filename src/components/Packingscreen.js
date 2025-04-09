import React, { useState, useEffect } from "react";
import axios from "axios";
import { message, Card, Table, Typography, Avatar, Tag, Modal, Input, Button } from "antd";
import { ClockCircleOutlined, FireFilled, UserOutlined } from "@ant-design/icons";
import moment from "moment";
import debounce from "lodash.debounce";
import config from "../config"; // Import the config file
const { Title, Text } = Typography;

const PackingScreen = ({ userName }) => {
  const [orderID, setOrderID] = useState("");
  const [orderDetails, setOrderDetails] = useState(null);
  const [scannedProducts, setScannedProducts] = useState({});
  const [isOrderPacked, setIsOrderPacked] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to scan Order ID");
  const [packingStage, setPackingStage] = useState("INITIAL"); // INITIAL, SCANNING, PACKING, COMPLETED, ON_HOLD
  const [scanBuffer, setScanBuffer] = useState("");
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(moment().format("HH:mm:ss"));
  const [temperature, setTemperature] = useState("30°C");
  const [isHoldModalVisible, setIsHoldModalVisible] = useState(false); // For hold modal
  const [holdReason, setHoldReason] = useState(""); // Reason for holding

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(moment().format("HH:mm:ss"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const currentTime = new Date().getTime();
      const key = e.key;

      if (e.ctrlKey || e.altKey || e.metaKey || key.length > 1) return;

      setScanBuffer((prev) => prev + key);
      setLastKeyTime(currentTime);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lastKeyTime, scanBuffer]);

  useEffect(() => {
    const debouncedProcessScannedData = debounce(() => {
      if (scanBuffer.length > 0) {
        processScannedData(scanBuffer);
        setScanBuffer("");
      }
    }, 200);

    debouncedProcessScannedData();
    return () => debouncedProcessScannedData.cancel();
  }, [scanBuffer]);

  const processScannedData = (scannedValue) => {
    const trimmedValue = scannedValue.trim();
    console.log(`Scanned Value: ${trimmedValue}`);
    if (!orderDetails) {
      fetchOrderDetails(trimmedValue);
    } else {
      if (trimmedValue === orderID && isPackingComplete()) {
        completePacking();
      } else {
        handleProductScan(trimmedValue);
      }
    }
  };

  const fetchOrderDetails = (scannedOrderID) => {
    setStatusMessage(`Fetching order details for ${scannedOrderID}...`);
    setPackingStage("SCANNING");
    const url = `${config.apiBaseUrl}/order/${encodeURIComponent(scannedOrderID)}`;
    axios
      .get(url)
      .then((res) => {
        if (res.data.order && res.data.order.packed_status === "Completed") {
          message.warning("This order is already packed.");
          setIsOrderPacked(true);
          setStatusMessage("Order already packed. Scan a new Order ID.");
          setPackingStage("COMPLETED");
        } else if (res.data.order && res.data.order.status === "On Hold") {
          message.warning("This order is on hold.");
          setOrderDetails(res.data.order);
          setOrderID(scannedOrderID);
          setStatusMessage(`Order ${scannedOrderID} is on hold. Reason: ${res.data.order.hold_reason}`);
          setPackingStage("ON_HOLD");
        } else if (res.data.order) {
          setOrderDetails(res.data.order);
          setOrderID(scannedOrderID);
          setScannedProducts({});
          setIsOrderPacked(false);
          setStatusMessage(`Order ${scannedOrderID} scanned successfully`);
          setPackingStage("PACKING");
          message.success("Order scanned! Begin scanning products.");
        } else {
          setStatusMessage("No order found.");
          setPackingStage("INITIAL");
          message.error("No order found.");
        }
      })
      .catch(() => {
        setStatusMessage("Failed to fetch order.");
        setPackingStage("INITIAL");
        message.error("Failed to fetch order.");
      });
  };

  const parseProductCode = (scannedValue) => {
    // Example scanned value: "010000422072024310NC250290325"
    // Step 1: Remove "01" from the start
    if (scannedValue.startsWith("01")) {
      scannedValue = scannedValue.slice(2); // "0000422072024310NC250290325"
    }

    // Step 2: Extract the first 14 digits as the product code (before the "10")
    const productCode = scannedValue.slice(0, 14); // "00004220720243"

    return productCode;
  };

  const handleProductScan = (scannedValue) => {
    // Parse the scanned barcode to extract the product code
    const productID = parseProductCode(scannedValue);
    console.log(`Parsed Product ID: ${productID}`);

    // Match against updated_id instead of id
    const product = orderDetails?.products.find((p) => p.updated_id === productID);

    if (product) {
      setScannedProducts((prev) => {
        const newScannedProducts = { ...prev };
        // Use updated_id as the key for tracking scanned products
        newScannedProducts[productID] = (newScannedProducts[productID] || 0) + 1;

        if (newScannedProducts[productID] > product.quantity) {
          message.error("Exceeds required quantity.");
          newScannedProducts[productID] = product.quantity;
        } else {
          message.success(`Scanned ${product.name}`);
          setStatusMessage(`Packing in progress: Scanned ${product.name}`);
        }
        return newScannedProducts;
      });
    } else {
      message.error("Product not found in order.");
      setStatusMessage("Product not found. Continue scanning.");
    }
  };

  const completePacking = () => {
    const packedDate = new Date().toISOString();
    const packedTime = moment().format("HH:mm:ss");
    const packedPersonName = userName;

    axios
      .post(`${config.apiBaseUrl}/order/${encodeURIComponent(orderID)}/complete-packing`, {
        packed_status: "Completed",
        packed_date: packedDate,
        packed_time: packedTime,
        packed_person_name: packedPersonName,
      })
      .then(() => {
        message.success("Packing completed!");
        setOrderDetails(null);
        setOrderID("");
        setScannedProducts({});
        setIsOrderPacked(false);
        setStatusMessage("Packing completed successfully. Scan a new Order ID.");
        setPackingStage("INITIAL");
      })
      .catch(() => {
        setStatusMessage("Failed to complete packing.");
        message.error("Failed to complete packing.");
      });
  };

  const holdOrder = () => {
    if (!holdReason) {
      message.error("Please provide a reason for holding the order.");
      return;
    }

    axios
      .post(`${config.apiBaseUrl}/order/${encodeURIComponent(orderID)}/hold-packing`, {
        hold_reason: holdReason,
        reason_text: holdReason,
      })
      .then(() => {
        message.success("Order placed on hold!");
        setOrderDetails(null);
        setOrderID("");
        setScannedProducts({});
        setIsOrderPacked(false);
        setStatusMessage("Order placed on hold. Scan a new Order ID.");
        setPackingStage("INITIAL");
        setIsHoldModalVisible(false);
        setHoldReason("");
      })
      .catch(() => {
        message.error("Failed to place order on hold.");
      });
  };

  const isPackingComplete = () => {
    if (!orderDetails) return false;
    return orderDetails.products.every(
      (product) => scannedProducts[product.updated_id] === product.quantity
    );
  };

  const getStageTag = () => {
    switch (packingStage) {
      case "INITIAL":
        return <Tag color="blue">Ready to Scan</Tag>;
      case "SCANNING":
        return <Tag color="orange">Order Scanned</Tag>;
      case "PACKING":
        return <Tag color="purple">Packing in Progress</Tag>;
      case "COMPLETED":
        return <Tag color="green">Packing Completed</Tag>;
      case "ON_HOLD":
        return <Tag color="red">On Hold</Tag>;
      default:
        return <Tag color="blue">Ready to Scan</Tag>;
    }
  };

  const columns = [
    { title: "Product", dataIndex: "name", key: "name" },    
    { title: "Weight", dataIndex: "weight", key: "weight" }, // Correctly reference the weight field         
    { title: "Quantity", dataIndex: "quantity", key: "quantity" },
    { title: "Scanned", dataIndex: "scanned", key: "scanned" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", padding: "20px", background: "#f5f5f5" }}>
      {/* Left Scanner Section */}
      <div style={{ flex: 1, padding: "20px", background: "white", borderRadius: "10px" }}>
        <Title level={2}>Packing Console</Title>
        <Card style={{ textAlign: "center", padding: "40px", background: "#e6f7ff" }}>
          <Text strong>Status: {statusMessage}</Text>
          <div style={{ marginTop: "20px" }}>{getStageTag()}</div>
          <div style={{ marginTop: "20px", fontSize: "18px", fontWeight: "bold" }}>
            {orderID ? `Order ID: ${orderID}` : "Scan Order ID to Begin"}
          </div>
          {packingStage === "PACKING" && (
            <Button
              type="danger"
              onClick={() => setIsHoldModalVisible(true)}
              style={{ marginTop: "20px" }}
            >
              Hold Order
            </Button>
          )}
        </Card>
      </div>

      {/* Right Dashboard */}
      <div style={{ flex: 2, padding: "20px", marginLeft: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            backgroundColor: "cadetblue",
            padding: "20px",
            borderRadius: "10px",
          }}
        >
          <Title level={3} style={{ color: "white", margin: 0 }}>
            <ClockCircleOutlined /> {currentTime}
          </Title>
          <Title level={3} style={{ color: "white", margin: 0 }}>
            <FireFilled /> {temperature}
          </Title>
        </div>

        {orderDetails && (
          <Card style={{ marginBottom: "20px", background: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Avatar
                shape="square"
                size="large"
                icon={<UserOutlined />}
                style={{ backgroundColor: "rgb(27 70 73)", marginRight: "20px" }}
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <Text strong>Customer Name: {orderDetails.customer.name}</Text>
                <Text strong>Customer Email: {orderDetails.customer.email}</Text>
                {orderDetails.status === "On Hold" && (
                  <Text strong>Hold Reason: {orderDetails.hold_reason}</Text>
                )}
              </div>
            </div>
          </Card>
        )}

<Card title="Scanned Products" style={{ borderRadius: "10px", padding: "10px" }}>
  <Table
    rowClassName={(record) =>
      scannedProducts[record.key] === record.quantity ? "highlight-green" : ""
    }
    dataSource={
      orderDetails
        ? orderDetails.products.map((product) => {
            // Debug the SKU field
            console.log("SKU:", product.sku);

            // Extract weight from SKU
            const weightMatch = product.sku?.match(/(\d+)(g|kg|ml|l)/i); // Match weight in SKU
            const weight = weightMatch
              ? weightMatch[2].toLowerCase() === "ml"
                ? `${parseFloat(weightMatch[1]) / 1000} l` // Convert ml to liters
                : weightMatch[2].toLowerCase() === "l"
                ? `${parseFloat(weightMatch[1])} l` // Keep liters as is
                : weightMatch[2].toLowerCase() === "kg"
                ? `${parseFloat(weightMatch[1])} kg` // Keep kilograms as is
                : `${parseFloat(weightMatch[1]) / 1000} kg` // Convert grams to kilograms
              : "Unknown";

            return {
              key: product.updated_id, // Use updated_id as the key
              name: product.name,
              quantity: product.quantity,
              scanned: scannedProducts[product.updated_id] || 0,
              weight: weight, // Bind the extracted weight
            };
          })
        : []
    }
    columns={[
      { title: "Product", dataIndex: "name", key: "name" },
      { title: "Weight", dataIndex: "weight", key: "weight" }, // Correctly reference the weight field
      { title: "Quantity", dataIndex: "quantity", key: "quantity" },
      { title: "Scanned", dataIndex: "scanned", key: "scanned" },
    ]}
    pagination={false}
  />
</Card>
      </div>

      {/* Hold Order Modal */}
      <Modal
        title="Hold Order"
        visible={isHoldModalVisible}
        onOk={holdOrder}
        onCancel={() => {
          setIsHoldModalVisible(false);
          setHoldReason("");
        }}
        okText="Submit"
        cancelText="Cancel"
      >
        <Text>Please provide a reason for holding the order:</Text>
        <Input.TextArea
          value={holdReason}
          onChange={(e) => setHoldReason(e.target.value)}
          placeholder="E.g., Out of stock, waiting for approval, etc."
          rows={4}
          style={{ marginTop: "10px" }}
        />
      </Modal>
    </div>
  );
};

export default PackingScreen;