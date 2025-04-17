import React, { useState, useEffect } from "react";
import axios from "axios";
import { message, Card, Table, Typography, Avatar, Tag, Modal, Input, Button, List } from "antd";
import { ClockCircleOutlined, FireFilled, UserOutlined } from "@ant-design/icons";
import moment from "moment";
import debounce from "lodash.debounce";
import config from "../config";
const { Title, Text } = Typography;

const PackingScreen = ({ userName }) => {
  const [orderID, setOrderID] = useState("");
  const [orderDetails, setOrderDetails] = useState(null);
  const [scannedProducts, setScannedProducts] = useState({});
  const [isOrderPacked, setIsOrderPacked] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to scan Order ID");
  const [packingStage, setPackingStage] = useState("INITIAL");
  const [scanBuffer, setScanBuffer] = useState("");
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(moment().format("HH:mm:ss"));
  const [temperature, setTemperature] = useState("30°C");
  const [isHoldModalVisible, setIsHoldModalVisible] = useState(false);
  const [holdReason, setHoldReason] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [isOverrideModalVisible, setIsOverrideModalVisible] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

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
    console.log(`Fetching order from: ${url}`);
    axios
      .get(url)
      .then((res) => {
        if (res.data.order && res.data.order.packed_status === "Completed") {
          message.warning("This order is already packed.");
          setIsOrderPacked(true);
          setStatusMessage("Order already packed. Scan a new Order ID.");
          setPackingStage("COMPLETED");
        } else if (res.data.order && res.data.order.packed_status === "Overridden") {
          message.warning("This order has been overridden.");
          setIsOrderPacked(true);
          setStatusMessage("Order overridden. Scan a new Order ID.");
          setPackingStage("OVERRIDDEN");
        } else if (res.data.order && res.data.order.status === "On Hold") {
          message.warning("This order is on hold.");
          setOrderDetails(res.data.order);
          setOrderID(scannedOrderID);
          setStatusMessage(`Order ${scannedOrderID} is on hold. Reason: ${res.data.order.hold_reason}`);
          setPackingStage("ON_HOLD");
        } else if (res.data.order) {
          // Validate shipment statuses
          const validStatuses = ["PICKUP EXCEPTION", "OUT FOR PICKUP", "PICKUP SCHEDULED"];
          const shipments = res.data.order.shipments || [];
          const invalidShipment = shipments.find(
            (shipment) => !validStatuses.includes(shipment.status)
          );

          if (invalidShipment) {
            message.error(
              `Cannot pack order: Shipment status "${invalidShipment.status}" is not allowed. Please cross-check the status.`
            );
            setStatusMessage(
              `Invalid shipment status: ${invalidShipment.status}. Only PICKUP EXCEPTION, OUT FOR PICKUP, Or Out For PICKUP SCHEDULED allowed.`
            );
            setPackingStage("INITIAL");
            return;
          }

          setOrderDetails(res.data.order);
          setOrderID(scannedOrderID);
          setScannedProducts({});
          setIsOrderPacked(false);
          setStatusMessage(`Order ${scannedOrderID} scanned successfully`);
          setPackingStage("PACKING");
          message.success("Order scanned! Begin scanning products.");
          setStartTime(new Date());
        } else {
          setStatusMessage("No order found.");
          setPackingStage("INITIAL");
          message.error("No order found.");
        }
      })
      .catch((error) => {
        console.error("Fetch order error:", error.response?.data || error.message);
        setStatusMessage("Failed to fetch order.");
        setPackingStage("INITIAL");
        message.error("Failed to fetch order.");
      });
  };

  const parseProductCode = (scannedValue) => {
    if (scannedValue.startsWith("01")) {
      scannedValue = scannedValue.slice(2);
    }
    const productCode = scannedValue.slice(0, 14);
    return productCode;
  };

  const handleProductScan = (scannedValue) => {
    const productID = parseProductCode(scannedValue);
    console.log(`Parsed Product ID: ${productID}`);

    const product = orderDetails?.products.find((p) => p.updated_id === productID);

    if (product) {
      setScannedProducts((prev) => {
        const newScannedProducts = { ...prev };
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

  const saveUserPerformance = (data) => {
    console.log("Saving user performance data:", data);
    axios
      .post(`${config.apiBaseUrl}/user-performance`, data)
      .then(() => {
        console.log("User performance data saved successfully.");
      })
      .catch((err) => {
        console.error("Failed to save user performance data:", err.response?.data || err.message);
      });
  };

  const completePacking = () => {
    const packedDate = new Date().toISOString();
    const packedTime = moment().format("HH:mm:ss");
    const packedPersonName = userName;

    const userPerformanceData = {
      user: userName,
      orderId: orderID,
      startTime,
      endTime: new Date(),
      packedDate,
      products: orderDetails.products.map((product) => ({
        name: product.name,
        sku: product.sku,
        quantity: product.quantity,
        scannedQuantity: scannedProducts[product.updated_id] || 0,
        override: scannedProducts[product.updated_id] < product.quantity,
      })),
      holdReason: null,
    };

    console.log("Completing packing for orderID:", orderID);
    console.log("Complete packing data:", {
      packed_status: "Completed",
      packed_date: packedDate,
      packed_time: packedTime,
      packed_person_name: packedPersonName,
    });

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
        saveUserPerformance(userPerformanceData);
      })
      .catch((error) => {
        console.error("Complete packing error:", error.response?.data || error.message);
        setStatusMessage("Failed to complete packing.");
        message.error("Failed to complete packing.");
      });
  };

  const holdOrder = () => {
    if (!holdReason) {
      message.error("Please provide a reason for holding the order.");
      return;
    }
    const packedPersonName = userName;
    const userPerformanceData = {
      user: userName,
      orderId: orderID,
      startTime,
      endTime: new Date(),
      packedDate: new Date(),
      products: orderDetails.products.map((product) => ({
        name: product.name,
        sku: product.sku,
        quantity: product.quantity,
        scannedQuantity: scannedProducts[product.updated_id] || 0,
        override: scannedProducts[product.updated_id] < product.quantity,
      })),
      holdReason,
    };

    console.log("Holding order for orderID:", orderID);
    console.log("Hold order data:", {
      hold_reason: holdReason,
      reason_text: holdReason,
      packed_person_name: packedPersonName,
    });

    axios
      .post(`${config.apiBaseUrl}/order/${encodeURIComponent(orderID)}/hold-packing`, {
        hold_reason: holdReason,
        reason_text: holdReason,
        packed_person_name: packedPersonName,
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
        saveUserPerformance(userPerformanceData);
      })
      .catch((error) => {
        console.error("Hold order error:", error.response?.data || error.message);
        message.error("Failed to place order on hold.");
      });
  };

  const overrideOrder = () => {
    if (!overrideReason) {
        message.error("Please provide a reason for overriding the order.");
        return;
    }
    if (orderDetails?.packed_status === "Completed" || orderDetails?.packed_status === "Overridden") {
        message.error(`Order is already ${orderDetails.packed_status.toLowerCase()}. Cannot override.`);
        setIsOverrideModalVisible(false);
        return;
    }

    const packedDate = new Date().toISOString();
    const packedTime = moment().format("HH:mm:ss");
    const packedPersonName = userName;

    const overrideData = {
        packed_status: "Overridden",
        packed_date: packedDate,
        packed_time: packedTime,
        packed_person_name: packedPersonName,
        override_reason: overrideReason,
        products: orderDetails.products.map((product) => ({
            name: product.name,
            quantity: product.quantity,
            scannedQuantity: scannedProducts[product.updated_id] || 0,
        })),
    };

    axios
        .post(`${config.apiBaseUrl}/order/${encodeURIComponent(orderID)}/override-packing`, overrideData)
        .then((response) => {
            if (response.status === 200) {
                message.success("Order packing overridden successfully!");
                setOrderDetails((prevDetails) => ({
                    ...prevDetails,
                    packed_status: "Overridden",
                }));
                setPackingStage("OVERRIDDEN");
                setStatusMessage("Order packing overridden. Scan a new Order ID.");
                setOverrideReason(""); // Clear the override reason
                setIsOverrideModalVisible(false); // Close the modal
            } else {
                console.error("Unexpected server response:", response.data);
                message.error("Override succeeded, but status not updated correctly.");
            }
        })
        .catch((error) => {
            console.error("Override packing error:", error.response?.data || error.message);
            message.error(`Failed to override order packing: ${error.response?.data?.message || error.message}`);
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
      case "OVERRIDDEN":
        return <Tag color="cyan">Packing Overridden</Tag>;
      default:
        return <Tag color="blue">Ready to Scan</Tag>;
    }
  };

  const columns = [
    { title: "Product", dataIndex: "name", key: "name" },
    { title: "Weight", dataIndex: "weight", key: "weight" },
    { title: "Quantity", dataIndex: "quantity", key: "quantity" },
    { title: "Scanned", dataIndex: "scanned", key: "scanned" },
  ];

  const getMissingProducts = () => {
    if (!orderDetails) return [];
    return orderDetails.products.filter(
      (product) => (scannedProducts[product.updated_id] || 0) < product.quantity
    );
  };

  return (
    <div style={{ display: "flex", height: "100vh", padding: "20px", background: "#f5f5f5" }}>
      <div style={{ flex: 1, padding: "20px", background: "white", borderRadius: "10px" }}>
        <Title level={2}>Packing Console</Title>
        <Card style={{ textAlign: "center", padding: "40px", background: "#e6f7ff" }}>
          <Text strong>Status: ${statusMessage}</Text>
          <div style={{ marginTop: "20px" }}>{getStageTag()}</div>
          <div style={{ marginTop: "20px", fontSize: "18px", fontWeight: "bold" }}>
            {orderID ? `Order ID: ${orderID}` : "Scan Order ID to Begin"}
          </div>
          {packingStage === "PACKING" && (
            <div>
              <Button
                type="danger"
                onClick={() => setIsHoldModalVisible(true)}
                style={{ marginTop: "20px", marginRight: "10px" }}
              >
                Hold Order
              </Button>
              <Button
  danger
  onClick={() => setIsOverrideModalVisible(true)}
  style={{ marginTop: "20px" }}
>
  Override Packing
</Button>
            </div>
          )}
        </Card>
      </div>

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
                    const weightMatch = product.sku?.match(/(\d+)(g|kg|ml|l)/i);
                    const weight = weightMatch
                      ? weightMatch[2].toLowerCase() === "ml"
                        ? `${parseFloat(weightMatch[1]) / 1000} l`
                        : weightMatch[2].toLowerCase() === "l"
                        ? `${parseFloat(weightMatch[1])} l`
                        : weightMatch[2].toLowerCase() === "kg"
                        ? `${parseFloat(weightMatch[1])} kg`
                        : `${parseFloat(weightMatch[1]) / 1000} kg`
                      : product.weight
                      ? `${product.weight} kg`
                      : "Unknown";

                    return {
                      key: product.updated_id,
                      name: product.name,
                      quantity: product.quantity,
                      scanned: scannedProducts[product.updated_id] || 0,
                      weight: weight,
                    };
                  })
                : []
            }
            columns={columns}
            pagination={false}
          />
        </Card>
      </div>

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

      <Modal
        title="Override Packing"
        visible={isOverrideModalVisible}
        onOk={overrideOrder}
        onCancel={() => {
          setIsOverrideModalVisible(false);
          setOverrideReason("");
        }}
        okText="Submit Override"
        cancelText="Cancel"
      >
        <Text>Missing Products:</Text>
        <List
          dataSource={getMissingProducts()}
          renderItem={(product) => (
            <List.Item>
              {product.name} - Required: {product.quantity}, Scanned: {scannedProducts[product.updated_id] || 0}
            </List.Item>
          )}
          style={{ marginTop: "10px", marginBottom: "20px" }}
        />
        <Text>Please provide a reason for overriding the order:</Text>
        <Input.TextArea
          value={overrideReason}
          onChange={(e) => setOverrideReason(e.target.value)}
          placeholder="E.g., Product out of stock, customer request, etc."
          rows={4}
          style={{ marginTop: "10px" }}
        />
      </Modal>
    </div>
  );
};

export default PackingScreen;