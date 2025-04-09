import React, { useState, useEffect } from "react";
import axios from "axios";
import { message, Card, Table, Typography, Tag } from "antd";
import { ClockCircleOutlined, FireFilled } from "@ant-design/icons";
import moment from "moment";
import debounce from "lodash.debounce";

const { Title, Text } = Typography;

const DeliveryPage = () => {
  const [awbCode, setAwbCode] = useState("");
  const [fullAwbCode, setFullAwbCode] = useState(""); // Store the full AWB code with prefix
  const [orderDetails, setOrderDetails] = useState(null);
  const [statusMessage, setStatusMessage] = useState("Ready to scan AWB Code");
  const [deliveryStage, setDeliveryStage] = useState("INITIAL"); // INITIAL, SCANNING, DELIVERING, COMPLETED
  const [scanBuffer, setScanBuffer] = useState("");
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(moment().format("HH:mm:ss"));
  const [temperature, setTemperature] = useState("30°C");

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
    } else if (trimmedValue === awbCode) {
      updateDeliveryStatus();
    }
  };

  const fetchOrderDetails = (scannedAwbCode) => {
    setStatusMessage(`Fetching order details for AWB: ${scannedAwbCode}...`);
    setDeliveryStage("SCANNING");
    const url = `http://localhost:5000/order/awb/${encodeURIComponent(scannedAwbCode)}`;

    axios
      .get(url)
      .then((res) => {
        if (!res.data.order) {
          setStatusMessage("No order found for this AWB code.");
          setDeliveryStage("INITIAL");
          message.error("No order found.");
        } else if (res.data.order.packed_status !== "Completed") {
          setStatusMessage("Order must be packed before delivery.");
          setDeliveryStage("INITIAL");
          message.warning("Order not packed yet.");
        } else if (res.data.order.warehouse_out === "Yes") {
          setStatusMessage("Order already marked as warehouse out.");
          setDeliveryStage("COMPLETED");
          message.warning("Order already processed for delivery.");
          setOrderDetails(res.data.order);
          setAwbCode(scannedAwbCode);
          // Find the full AWB code from shipments
          const shipment = res.data.order.shipments.find((s) => s.awb_code.includes(scannedAwbCode));
          setFullAwbCode(shipment ? shipment.awb_code : scannedAwbCode);
        } else {
          setOrderDetails(res.data.order);
          setAwbCode(scannedAwbCode);
          // Find the full AWB code from shipments
          const shipment = res.data.order.shipments.find((s) => s.awb_code.includes(scannedAwbCode));
          setFullAwbCode(shipment ? shipment.awb_code : scannedAwbCode);
          setStatusMessage(`AWB ${scannedAwbCode} scanned successfully. Scan again to confirm delivery.`);
          setDeliveryStage("DELIVERING");
          message.success("AWB scanned! Scan again to confirm warehouse out.");
        }
      })
      .catch(() => {
        setStatusMessage("Failed to fetch order.");
        setDeliveryStage("INITIAL");
        message.error("Failed to fetch order.");
      });
  };

  const updateDeliveryStatus = () => {
    const warehouseOutDate = new Date().toISOString();
    const warehouseOutTime = moment().format("HH:mm:ss");

    axios
      .post(`http://localhost:5000/order/awb/${encodeURIComponent(awbCode)}/delivery`, {
        warehouse_out: "Yes",
        warehouse_out_date: warehouseOutDate,
        warehouse_out_time: warehouseOutTime,
      })
      .then(() => {
        message.success("Delivery status updated successfully!");
        setOrderDetails((prev) => ({
          ...prev,
          warehouse_out: "Yes",
          warehouse_out_date: warehouseOutDate,
          warehouse_out_time: warehouseOutTime,
        }));
        setStatusMessage("Delivery completed. Scan a new AWB Code.");
        setDeliveryStage("COMPLETED");
      })
      .catch(() => {
        setStatusMessage("Failed to update delivery status.");
        message.error("Failed to update delivery status.");
      });
  };

  const getStageTag = () => {
    switch (deliveryStage) {
      case "INITIAL":
        return <Tag color="blue">Ready to Scan</Tag>;
      case "SCANNING":
        return <Tag color="orange">AWB Scanned</Tag>;
      case "DELIVERING":
        return <Tag color="purple">Ready to Confirm</Tag>;
      case "COMPLETED":
        return <Tag color="green">Delivery Completed</Tag>;
      default:
        return <Tag color="blue">Ready to Scan</Tag>;
    }
  };

  const columns = [
    { title: "Product", dataIndex: "name", key: "name" },
    { title: "Quantity", dataIndex: "quantity", key: "quantity" },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", padding: "20px", background: "#f5f5f5" }}>
      {/* Left Scanner Section */}
      <div style={{ flex: 1, padding: "20px", background: "white", borderRadius: "10px" }}>
        <Title level={2}>Delivery Console</Title>
        <Card style={{ textAlign: "center", padding: "40px", background: "#e6f7ff" }}>
          <Text strong>Status: {statusMessage}</Text>
          <div style={{ marginTop: "20px" }}>{getStageTag()}</div>
          <div style={{ marginTop: "20px", fontSize: "18px", fontWeight: "bold" }}>
            {fullAwbCode ? `AWB Code: ${fullAwbCode}` : "Scan AWB Code to Begin"}
          </div>
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
            <Text strong>Order ID: {orderDetails.orderID}</Text>
            <br />
            <Text strong>Customer Name: {orderDetails.customer.name}</Text>
            <br />
            <Text strong>Packed Status: {orderDetails.packed_status}</Text>
            <br />
            <Text strong>Warehouse Out: {orderDetails.warehouse_out}</Text>
            {orderDetails.warehouse_out === "Yes" && (
              <>
                <br />
                <Text strong>Warehouse Out Date: {moment(orderDetails.warehouse_out_date).format("YYYY-MM-DD")}</Text>
                <br />
                <Text strong>Warehouse Out Time: {orderDetails.warehouse_out_time}</Text>
              </>
            )}
          </Card>
        )}

        {orderDetails && (
          <Card title="Order Products" style={{ borderRadius: "10px", padding: "10px" }}>
            <Table
              dataSource={orderDetails.products.map((product) => ({
                key: product.id,
                name: product.name,
                quantity: product.quantity,
              }))}
              columns={columns}
              pagination={false}
            />
          </Card>
        )}
      </div>
    </div>
  );
};

export default DeliveryPage;