import React, { useEffect, useState } from "react";
import axios from "axios";
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from "react-router-dom";
import moment from "moment";
import { Layout, Menu, Spin } from "antd"; // Import Spin for loading
import Cookies from "js-cookie";
import DeliveryPage from "./components/DeliveryPage";
import config from "./config.js"; // Import the config file
import {
  SyncOutlined,
  OrderedListOutlined,
  BoxPlotOutlined,
  EditOutlined,
  DashboardOutlined,
  SettingOutlined,
  CarOutlined,
} from "@ant-design/icons";
import SyncPage from "./components/SyncPage";
import OrdersPage from "./components/OrdersPage";
import PackingScreen from "./components/Packingscreen";
import UpdateProductIds from "./components/UpdateProductIDs.js";
import DashboardPage from "./components/DashboardPage.js";
import CustomHeader from "./components/Header";
import SignIn from "./components/SignIn";
import SignUp from "./components/SignUp";
import SettingsPage from "./components/SettingsPage";
import StockAssessmentPage from "./components/StockAssessmentPage";
import { Vortex } from "react-loader-spinner"; // Import the loader
const { Content, Footer, Sider } = Layout;

function App() {
  const [orders, setOrders] = useState([]);
  const [columnWidths, setColumnWidths] = useState({});
  const [token, setToken] = useState(Cookies.get('token') || null);
  const [userName, setUserName] = useState(Cookies.get('userName') || '');
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(() => {
    const savedPermissions = Cookies.get('permissions');
    return savedPermissions ? JSON.parse(savedPermissions) : {};
  });
  

  useEffect(() => {
    const savedToken = Cookies.get('token');
    const savedUserName = Cookies.get('userName');
    const savedPermissions = Cookies.get('permissions');
  
    if (savedToken && savedUserName && savedPermissions) {
      setToken(savedToken);
      setUserName(savedUserName);
      setPermissions(JSON.parse(savedPermissions));
      // Simulate a 3-second delay for the loader
      setTimeout(() => {
        setLoading(false);
      }, 3000);
    } else {
      setLoading(false); // If no token, stop loading immediately
    }
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${config.apiBaseUrl}/all-orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fetchedOrders = response.data.orders || [];
      console.log("Fetched Orders:", fetchedOrders);
      setOrders(fetchedOrders);
    } catch (err) {
      console.error("Failed to fetch orders", err);
      setOrders([]);
      if (err.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false); // Stop loading after fetch completes
    }
  };

  useEffect(() => {
    if (token) {
      fetchOrders();
    }
  }, [token]);

  const handleSyncComplete = (syncedOrders) => {
    setOrders(syncedOrders);
  };

  const handleResize = (index) => (e, { size }) => {
    setColumnWidths((prev) => ({
      ...prev,
      [columns[index].key]: size.width,
    }));
  };

  const columns = [
    {
      title: "S.No",
      key: "sno",
      width: columnWidths["sno"] || 70,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Order ID",
      dataIndex: "orderID",
      key: "orderID",
      width: columnWidths["orderID"] || 150,
    },
    {
      title: "Customer Name",
      dataIndex: ["customer_details", "name"],
      key: "customer_name",
      width: columnWidths["customer_name"] || 150,
    },
    {
      title: "Customer Mobile",
      dataIndex: ["customer_details", "mobile"],
      key: "customer_mobile",
      width: columnWidths["customer_mobile"] || 150,
    },
    {
      title: "Customer Email",
      dataIndex: ["customer_details", "email"],
      key: "customer_email",
      width: columnWidths["customer_email"] || 200,
    },
    {
      title: "Courier",
      dataIndex: ["shipments", 0, "courier_name"],
      key: "courier_name",
      width: columnWidths["courier_name"] || 150,
    },
    {
      title: "AWB Code",
      dataIndex: ["shipments", 0, "awb_code"],
      key: "awb_code",
      width: columnWidths["awb_code"] || 150,
    },
    {
      title: "Packing Status",
      dataIndex: "packed_status",
      key: "packed_status",
      width: columnWidths["packed_status"] || 120,
      render: (status) => (
        <span
          style={{
            padding: "4px 8px",
            borderRadius: "12px",
            background: status === "Completed" ? "#e6ffe6" : "#fff3e6",
            color: status === "Completed" ? "#006600" : "#663300",
          }}
        >
          {status}
        </span>
      ),
    },
    {
      title: "Order Date",
      dataIndex: "order_date",
      key: "order_date",
      width: columnWidths["order_date"] || 120,
      render: (text) => moment(text).format("DD-MM-YYYY"),
    },
    {
      title: "Packed Date",
      dataIndex: "packed_date",
      key: "packed_date",
      width: columnWidths["packed_date"] || 120,
      render: (text) => (text ? moment(text).format("DD-MM-YYYY") : "N/A"),
    },
    {
      title: "Packed Time",
      dataIndex: "packed_time",
      key: "packed_time",
      width: columnWidths["packed_time"] || 120,
    },
    {
      title: "Packed Person Name",
      dataIndex: "packed_person_name",
      key: "packed_person_name",
      width: columnWidths["packed_person_name"] || 150,
    },
    {
      title: "Warehouse Out",
      dataIndex: "warehouse_out",
      key: "warehouse_out",
      width: columnWidths["warehouse_out"] || 150,
    },
    {
      title: "Warehouse Out Date",
      dataIndex: "warehouse_out_date",
      key: "warehouse_out_date",
      width: columnWidths["warehouse_out_date"] || 120,
      render: (text) => (text ? moment(text).format("DD-MM-YYYY") : "N/A"),
    },
    {
      title: "Warehouse Out Time",
      dataIndex: "warehouse_out_time",
      key: "warehouse_out_time",
      width: columnWidths["warehouse_out_time"] || 120,
    },
    {
      title: "Products",
      dataIndex: "products",
      key: "products",
      width: columnWidths["products"] || 250,
      render: (products) => (
        <ul style={{ margin: 0, paddingLeft: "15px" }}>
          {products?.map((product, index) => (
            <li key={index}>
              {product.id} {product.name} - {product.quantity} × ₹{product.price}
            </li>
          )) || "No products"}
        </ul>
      ),
    },
  ];

  const enhancedColumns = columns.map((col, index) => ({
    ...col,
    onHeaderCell: (column) => ({
      width: column.width,
      onResize: handleResize(index),
    }),
  }));

  const handleLogout = () => {
    Cookies.remove('token');
    Cookies.remove('userName');
    Cookies.remove('permissions');
    setToken(null);
    setUserName('');
    setPermissions({});
    setOrders([]); // Clear orders on logout
  };

  return (
    <Router>
      <Layout style={{ minHeight: "100vh" }}>
        {token ? (
          loading ? (
            <div style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100vh",
            }}>
              <Vortex
                visible={true}
                height="80"
                width="80"
                ariaLabel="vortex-loading"
                colors={["red", "green", "blue", "yellow", "orange", "purple"]}
              />
            </div>
          ) : (
            <>
              <Sider collapsible theme="light" style={{ backgroundColor: "#fff" }}>
                <div className="logo" style={{ padding: "16px", textAlign: "center" }}>
                  <img
                    src="https://www.thegoodhealth.co.in/web/image/website/1/logo/www.thegoodhealth.co.in?unique=7145bcf"
                    alt="Logo"
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                </div>
                <Menu theme="light" defaultSelectedKeys={["1"]} mode="inline">
                  {permissions.dashboardAccess && (
                    <Menu.Item key="1" icon={<DashboardOutlined />}>
                      <Link to="/">Dashboard</Link>
                    </Menu.Item>
                  )}
                  {permissions.syncAccess && (
                    <Menu.Item key="2" icon={<SyncOutlined />}>
                      <Link to="/sync">Sync</Link>
                    </Menu.Item>
                  )}
                  {permissions.ordersAccess && (
                    <Menu.Item key="3" icon={<OrderedListOutlined />}>
                      <Link to="/orders">Orders</Link>
                    </Menu.Item>
                  )}
                  {permissions.packingAccess && (
                    <Menu.Item key="4" icon={<BoxPlotOutlined />}>
                      <Link to="/packing">Packing</Link>
                    </Menu.Item>
                  )}
                  {permissions.deliveryAccess && (
                    <Menu.Item key="7" icon={<CarOutlined />}>
                      <Link to="/delivery">Delivery</Link>
                    </Menu.Item>
                  )}
                  {permissions.productsAccess && (
                    <Menu.Item key="5" icon={<EditOutlined />}>
                      <Link to="/update-product-ids">Products</Link>
                    </Menu.Item>
                  )}
                   <Menu.Item key="8" icon={<CarOutlined />}>
                      <Link to="/stock-assessment">StockAssessment</Link>
                    </Menu.Item>
                  {permissions.settingsAccess && (
                    <Menu.Item key="6" icon={<SettingOutlined />}>
                      <Link to="/settings">Settings</Link>
                    </Menu.Item>
                  )}
                  
                </Menu>
              </Sider>
              <Layout className="site-layout">
                <CustomHeader
                  userName={userName}
                  setToken={setToken}
                  setUserName={setUserName}
                  handleLogout={handleLogout}
                />
                <Content >
                  <Routes>
                    {permissions.dashboardAccess && <Route path="/" element={<DashboardPage orders={orders} />} />}
                    {permissions.syncAccess && <Route path="/sync" element={<SyncPage onSyncComplete={handleSyncComplete} />} />}
                    {permissions.ordersAccess && (
                      <Route
                        path="/orders"
                        element={
                          <OrdersPage
                            orders={orders}
                            columnWidths={columnWidths}
                            handleResize={handleResize}
                            enhancedColumns={enhancedColumns}
                          />
                        }
                      />
                    )}
                   {permissions.packingAccess && <Route path="/packing" element={<PackingScreen userName={userName} />} />}
                    {permissions.deliveryAccess && <Route path="/delivery" element={<DeliveryPage orders={orders} setOrders={setOrders} />} />}
                    {permissions.productsAccess && <Route path="/update-product-ids" element={<UpdateProductIds />} />}
                    {permissions.settingsAccess && <Route path="/settings" element={<SettingsPage token={token} userName={userName} />} />}
                    <Route path="*" element={<Navigate to="/" />} />
                    
<Route path="/stock-assessment" element={<StockAssessmentPage />} />
                  </Routes>
                </Content>
                <Footer style={{ textAlign: "center" }}>
                  The Good Health ©2025
                </Footer>
              </Layout>
            </>
          )
        ) : (
          <Routes>
            <Route path="/signin" element={<SignIn setToken={setToken} setUserName={setUserName} setPermissions={setPermissions} />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="*" element={<Navigate to="/signin" />} />
          </Routes>
        )}
      </Layout>
    </Router>
  );
}

export default App;