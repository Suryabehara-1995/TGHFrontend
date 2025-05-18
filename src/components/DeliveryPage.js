import React, { useState, useEffect, useRef } from "react";
import { Table, Button, message, Spin, Card, Row, Col, Divider, Switch, Image } from "antd";
import { DatePicker } from "antd";
import * as XLSX from "xlsx";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import axios from "axios";
import config from "../config";
import "./OrderSync.css";

const { RangePicker } = DatePicker;

const OrderSync = () => {
  const [orders, setOrders] = useState([]);
  const [productMappings, setProductMappings] = useState([]);
  const [dateRange, setDateRange] = useState([null, null]);
  const [loading, setLoading] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isAutomatedSync, setIsAutomatedSync] = useState(false);
  const [initializingAction, setInitializingAction] = useState(null);
  const intervalRef = useRef(null);

  // Fetch ProductMapping data on component mount
  useEffect(() => {
    fetchProductMappings();
  }, []);

  const fetchProductMappings = async () => {
    try {
      const response = await axios.get(`${config.apiBaseUrl}/get-previous-products`);
      setProductMappings(response.data);
    } catch (error) {
      message.error("Failed to fetch product mappings");
      console.error("Error fetching product mappings:", error);
    }
  };

  useEffect(() => {
    if (orders.length > 0) {
      // Reset pagination or other logic if needed
    }
  }, [orders]);

  useEffect(() => {
    if (isAutomatedSync) {
      setInitializingAction("automated");
      intervalRef.current = startAutomatedSync();
      console.log(`[${new Date().toISOString()}] Automated sync started`);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log(`[${new Date().toISOString()}] Interval cleared`);
      }
      setInitializingAction(null);
    };
  }, [isAutomatedSync]);

  const fetchOrders = async (isAutomated = false, customDateRange = null) => {
    let effectiveDateRange = customDateRange || dateRange;

    console.log(`[${new Date().toISOString()}] fetchOrders: isAutomated=${isAutomated}, effectiveDateRange=`, effectiveDateRange);

    if (!isAutomated) {
      if (!effectiveDateRange[0] || !effectiveDateRange[1]) {
        message.warning("⚠ Please select both From and To dates.");
        return;
      }

      const convertToDate = (value) => {
        if (!value) return null;
        return value instanceof Date ? value : value.toDate ? value.toDate() : new Date(value);
      };

      const fromDate = convertToDate(effectiveDateRange[0]);
      const toDate = convertToDate(effectiveDateRange[1]);

      const isValidDate = (date) => date && date instanceof Date && !isNaN(date.getTime());

      if (!isValidDate(fromDate) || !isValidDate(toDate)) {
        console.error(`[${new Date().toISOString()}] Invalid dates: fromDate=`, fromDate, `toDate=`, toDate);
        message.error("❌ Invalid date selected. Please choose valid dates.");
        return;
      }

      effectiveDateRange = [fromDate, toDate];
    }

    if (isAutomated && !effectiveDateRange[0]) {
      const today = new Date();
      const yesterday = subDays(today, 1);
      effectiveDateRange = [startOfDay(yesterday), endOfDay(today)];
    }

    if (!isAutomated && isAutomatedSync) {
      setIsAutomatedSync(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log(`[${new Date().toISOString()}] Automated sync stopped due to manual search`);
      }
    }

    setLoading(!isAutomated);
    setInitializingAction(isAutomated ? "automated" : "manual");
    if (!isAutomated) {
      message.loading({ content: "Fetching orders...", key: "fetching" });
    }

    try {
      const timeZone = "Asia/Kolkata";
      const fromDateIST = startOfDay(toZonedTime(effectiveDateRange[0], timeZone));
      const toDateIST = endOfDay(toZonedTime(effectiveDateRange[1], timeZone));

      const fromDateUTC = format(fromZonedTime(fromDateIST, timeZone), "yyyy-MM-dd'T'HH:mm:ss'Z'");
      const toDateUTC = format(fromZonedTime(toDateIST, timeZone), "yyyy-MM-dd'T'HH:mm:ss'Z'");

      console.log(`[${new Date().toISOString()}] Fetching orders from ${fromDateUTC} to ${toDateUTC}`);

      const response = await fetch(`${config.apiBaseUrl}/shiprocket-orders?from=${fromDateUTC}&to=${toDateUTC}`);
      const data = await response.json();

      if (Array.isArray(data.orders) && data.orders.length > 0) {
        const validOrders = data.orders.filter(order => order.status?.toLowerCase() !== "canceled");
console.log(`[${new Date().toISOString()}] Valid orders:`, validOrders);
        if (validOrders.length === 0) {
          setOrders([]);
          setTotalOrders(0);
          if (!isAutomated) {
            message.warning("⚠ No valid orders found.");
          } else {
            console.log(`[${new Date().toISOString()}] Automated fetch: No valid orders found.`);
          }
          return;
        }

        setTotalOrders(validOrders.length);

        const processedOrders = validOrders.map((order) => {
          const enrichedProducts = Array.isArray(order.products)
            ? order.products.map((product) => {
                const weightMatch = product.channel_sku?.match(/(\d+)(g|kg)/i);
                const weight = weightMatch
                  ? parseFloat(weightMatch[1]) / (weightMatch[2].toLowerCase() === "kg" ? 1 : 1000)
                  : 0;

                // Map product to ProductMapping using product.name
                const productMapping = productMappings.find(
                  (mapping) => mapping.productName === product.name
                ) || {};

                return {
                  id: product.product_id|| `TEMP-PROD-${Date.now()}`,
                  updated_id: productMapping.updatedID || product.product_id || `TEMP-UPD-${Date.now()}`,
                  sku: product.channel_sku || "Unknown SKU",
                  name: product.name || "Unknown Item",
                  quantity: product.quantity || 0,
                  weight: weight,
                  imageUrl: productMapping.imageUrl || "",
                  productLocation: productMapping.productLocation || "Unknown",
                };
              })
            : [];

          return {
            key: order.channel_order_id || `TEMP-${Date.now()}`,
            orderID: order.channel_order_id || `TEMP-${Date.now()}`,
            order_date: order.created_at || "Unknown Date",
            customer: {
              name: order.customer_name || "Unknown",
              mobile: order.customer_phone || "Unknown",
              email: order.customer_email || "Unknown",
            },
            shipments: Array.isArray(order.shipments)
              ? order.shipments.map((shipment) => ({
                  courier_name: shipment.sr_courier_name || "N/A",
                  awb_code: shipment.awb || "N/A",
                  status: order.status || "N/A",
                }))
              : [],
            products: enrichedProducts,
            // Only include optional fields if explicitly provided
            ...(order.packed_status && { packed_status: order.packed_status }),
            ...(order.packed_date && { packed_date: order.packed_date }),
            ...(order.packed_time && { packed_time: order.packed_time }),
            ...(order.packed_person_name && { packed_person_name: order.packed_person_name }),
            ...(order.warehouse_out && { warehouse_out: order.warehouse_out }),
            ...(order.warehouse_out_date && { warehouse_out_date: order.warehouse_out_date }),
            ...(order.warehouse_out_time && { warehouse_out_time: order.warehouse_out_time }),
          };
        });

        // Validate orders before setting state
        const validProcessedOrders = processedOrders.filter(order => 
          order.orderID &&
          Array.isArray(order.products) && order.products.length > 0 &&
          Array.isArray(order.shipments)
        );

        setOrders(validProcessedOrders);
        if (!isAutomated) {
          message.success({
            content: `✅ ${validProcessedOrders.length} orders fetched successfully!`,
            key: "fetching",
            duration: 3,
          });
        } else {
          console.log(`[${new Date().toISOString()}] Automated fetch: ${validProcessedOrders.length} orders fetched successfully.`);
        }
        return validProcessedOrders;
      } else {
        setOrders([]);
        setTotalOrders(0);
        if (!isAutomated) {
          message.warning("⚠ No valid orders found.");
        } else {
          console.log(`[${new Date().toISOString()}] Automated fetch: No orders returned from API.`);
        }
        return [];
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      if (!isAutomated) {
        message.error(`❌ Failed to fetch orders: ${error.message}`);
      } else {
        console.error(`[${new Date().toISOString()}] Automated fetch error:`, error.message);
      }
      return [];
    } finally {
      setLoading(false);
      setInitializingAction(null);
    }
  };

  const uploadOrdersToMongoDB = async (isAutomated = false, customOrders = null, customDateRange = null) => {
    const effectiveOrders = customOrders || orders;
    let effectiveDateRange = customDateRange || dateRange;

    if (effectiveOrders.length === 0) {
      if (!isAutomated) {
        message.warning("⚠ No orders to upload.");
      } else {
        console.log(`[${new Date().toISOString()}] Automated upload: No orders to upload.`);
      }
      return;
    }

    if (!effectiveDateRange[0] || !effectiveDateRange[1]) {
      message.warning("⚠ Please select a valid date range before uploading.");
      return;
    }

    const convertToDate = (value) => {
      if (!value) return null;
      return value instanceof Date ? value : value.toDate ? value.toDate() : new Date(value);
    };

    const fromDate = convertToDate(effectiveDateRange[0]);
    const toDate = convertToDate(effectiveDateRange[1]);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      message.error("❌ Invalid date range. Please select valid dates.");
      return;
    }

    // Validate orders before uploading
    const validOrders = effectiveOrders.filter(order => 
      order.orderID &&
      Array.isArray(order.products) && order.products.length > 0 &&
      Array.isArray(order.shipments)
    );

    if (validOrders.length === 0) {
      if (!isAutomated) {
        message.warning("⚠ No valid orders to upload.");
      } else {
        console.log(`[${new Date().toISOString()}] Automated upload: No valid orders to upload.`);
      }
      return;
    }

    setLoading(!isAutomated);
    setInitializingAction(isAutomated ? "automated" : "manual");
    if (!isAutomated) {
      message.loading({ content: "Uploading orders...", key: "uploading" });
    }

    try {
      const timeZone = "Asia/Kolkata";
      const fromDateUTC = format(
        fromZonedTime(startOfDay(toZonedTime(fromDate, timeZone)), timeZone),
        "yyyy-MM-dd'T'HH:mm:ss'Z'"
      );
      const toDateUTC = format(
        fromZonedTime(endOfDay(toZonedTime(toDate, timeZone)), timeZone),
        "yyyy-MM-dd'T'HH:mm:ss'Z'"
      );

      const response = await fetch(`${config.apiBaseUrl}/sync-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: fromDateUTC, to: toDateUTC, orders: validOrders }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const result = await response.json();
      if (!isAutomated) {
        message.success({
          content: `✅ ${result.insertedCount || 0} orders uploaded successfully! AWB Updates: ${result.updatedAwbOrders.length > 0 ? result.updatedAwbOrders.length : "None"}`,
          key: "uploading",
          duration: 3,
        });
      } else {
        console.log(`[${new Date().toISOString()}] Automated upload: ${result.insertedCount || 0} orders uploaded successfully. AWB Updates: ${result.updatedAwbOrders.length > 0 ? result.updatedAwbOrders.length : "None"}`);
      }
    } catch (error) {
      console.error("Error uploading orders:", error);
      if (!isAutomated) {
        message.error(`❌ Failed to upload orders: ${error.message}`);
      } else {
        console.error(`[${new Date().toISOString()}] Automated upload error:`, error.message);
      }
    } finally {
      setLoading(false);
      setInitializingAction(null);
    }
  };

  const startAutomatedSync = () => {
    const sync = async () => {
      try {
        console.log(`[${new Date().toISOString()}] Starting automated sync`);
        const today = new Date();
        const yesterday = subDays(today, 1);
        const autoDateRange = [yesterday, today];

        const fetchedOrders = await fetchOrders(true, autoDateRange);
        if (fetchedOrders.length > 0) {
          await uploadOrdersToMongoDB(true, fetchedOrders, autoDateRange);
        }

        setLastSyncTime(new Date());
        console.log(`[${new Date().toISOString()}] Automated sync completed at ${format(new Date(), "HH:mm:ss")}`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Automated sync failed:`, error.message);
      }
    };

    sync();
    const intervalId = setInterval(sync, 30 * 60 * 1000);
    console.log(`[${new Date().toISOString()}] Interval set for 30 minutes`);
    return intervalId;
  };

  const downloadExcel = () => {
    const productData = orders.flatMap((order) =>
      order.products.map((product) => ({
        orderID: order.orderID,
      productID: product.id, // Now product_id exists
        sku: product.sku,
        productName: product.name,
        quantity: product.quantity,
        weight: product.weight,
        imageUrl: product.imageUrl,
        productLocation: product.productLocation,
      }))
    );

    const worksheet = XLSX.utils.json_to_sheet(productData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

    XLSX.writeFile(workbook, "products.xlsx");
  };

  const handleToggleAutomatedSync = (checked) => {
    setIsAutomatedSync(checked);
    if (!checked && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log(`[${new Date().toISOString()}] Automated sync stopped via toggle`);
    }
  };

  const columns = [
    {
      title: "Order ID",
      dataIndex: "orderID",
      key: "orderID",
      sorter: (a, b) => a.orderID.localeCompare(b.orderID),
    },
    {
      title: "Order Date",
      dataIndex: "order_date",
      key: "order_date",
      sorter: (a, b) => new Date(a.order_date) - new Date(b.order_date),
    },
    {
      title: "Customer Name",
      dataIndex: ["customer", "name"],
      key: "customer_name",
      sorter: (a, b) => a.customer.name.localeCompare(b.customer.name),
    },
    {
      title: "Packed Status",
      dataIndex: "packed_status",
      key: "packed_status",
      render: (status) => (
        <span
          style={{
            color: status === "Completed" ? "green" : "orange",
            fontWeight: "bold",
          }}
        >
          {status || "Not Completed"}
        </span>
      ),
    },
  ];

  const expandedRowRender = (record) => {
    return (
      <div className="expanded-row">
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="Customer Details" bordered>
              <p><strong>Name:</strong> {record.customer.name}</p>
              <p><strong>Mobile:</strong> {record.customer.mobile}</p>
              <p><strong>Email:</strong> {record.customer.email}</p>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Packing Information" bordered>
              <p><strong>Status:</strong> {record.packed_status || "Not Completed"}</p>
              <p><strong>Date:</strong> {record.packed_date || "Unknown Date"}</p>
              <p><strong>Time:</strong> {record.packed_time || "Unknown Time"}</p>
              <p><strong>Packed By:</strong> {record.packed_person_name || "Unknown"}</p>
            </Card>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Card title="Products" bordered>
              {record.products.length > 0 ? (
                <ul>
                  {record.products.map((product, index) => (
                    <li key={index}>
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          width={50}
                          height={50}
                          style={{ objectFit: "cover", marginBottom: "10px" }}
                          preview={true}
                          fallback="https://via.placeholder.com/50"
                        />
                      ) : (
                        <p>No Image</p>
                      )}
                      <p><strong>Name:</strong> {product.name}</p>
                      <p><strong>SKU:</strong> {product.sku}</p>
                      <p><strong>Quantity:</strong> {product.quantity}</p>
                      <p><strong>Weight:</strong> {product.weight} kg</p>
                      <p><strong>Location:</strong> {product.productLocation}</p>
                      {index < record.products.length - 1 && <Divider />}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No products available</p>
              )}
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Shipments" bordered>
              {record.shipments.length > 0 ? (
                <ul>
                  {record.shipments.map((shipment, index) => (
                    <li key={index}>
                      <p><strong>Courier:</strong> {shipment.courier_name}</p>
                      <p><strong>AWB Code:</strong> {shipment.awb_code}</p>
                      <p><strong>Status:</strong> {shipment.status}</p>
                      {index < record.shipments.length - 1 && <Divider />}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No shipments available</p>
              )}
            </Card>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Card title="Warehouse Details" bordered>
              <p><strong>Warehouse Out:</strong> {record.warehouse_out || "Unknown"}</p>
              <p><strong>Date:</strong> {record.warehouse_out_date || "Unknown Date"}</p>
              <p><strong>Time:</strong> {record.warehouse_out_time || "Unknown Time"}</p>
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  return (
    <div className="order-sync-container">
      <Card className="order-sync-card">
        <div style={{ marginBottom: 16 }}>
          <Switch
            checked={isAutomatedSync}
            onChange={handleToggleAutomatedSync}
            checkedChildren="Automated Sync On"
            unCheckedChildren="Automated Sync Off"
          />
        </div>
        {initializingAction && (
          <div
            style={{
              backgroundColor: "#1890ff",
              color: "white",
              padding: "10px",
              marginBottom: "16px",
              borderRadius: "4px",
              textAlign: "center",
            }}
          >
            Initializing {initializingAction === "automated" ? "Automated" : "Manual"} Action
          </div>
        )}
        <div className="date-picker-container">
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              console.log(`[${new Date().toISOString()}] RangePicker onChange:`, dates);
              setDateRange(dates ? [dates[0], dates[1]] : [null, null]);
            }}
            format="DD/MM/YYYY"
            placeholder={["From Date", "To Date"]}
            style={{ width: 300 }}
            allowClear
            disabledDate={(current) => current && current > new Date()}
          />
        </div>
        <div className="button-group">
          <Button
            onClick={() => fetchOrders(false)}
            loading={loading}
            type="primary"
            icon={<span>📥</span>}
            style={{ marginRight: 10 }}
          >
            Fetch Orders
          </Button>
          <Button
            onClick={() => uploadOrdersToMongoDB(false)}
            disabled={loading || orders.length === 0}
            type="dashed"
            icon={<span>📤</span>}
            style={{ marginRight: 10 }}
          >
            Upload to MongoDB
          </Button>
          <Button
            onClick={downloadExcel}
            disabled={orders.length === 0}
            type="default"
            icon={<span>📥</span>}
          >
            Download Excel
          </Button>
        </div>
        {lastSyncTime && isAutomatedSync && (
          <p className="last-sync-time">
            Last Automated Sync: {format(lastSyncTime, "dd/MM/yyyy HH:mm:ss")}
          </p>
        )}
        {loading ? (
          <div className="spinner-container">
            <Spin size="large" />
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={orders}
            expandable={{ expandedRowRender }}
            pagination={{ pageSize: 10 }}
            rowClassName="table-row"
            className="order-table"
          />
        )}
        <p className="total-orders">Total Orders: {totalOrders}</p>
      </Card>
    </div>
  );
};

export default OrderSync;
