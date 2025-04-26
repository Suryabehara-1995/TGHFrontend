import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, Row, Col, Badge, Button } from "antd";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { FaChartBar, FaCalendarDay, FaCalendarMinus, FaPauseCircle, FaCheckCircle, FaSun, FaMoon, FaTruck } from "react-icons/fa";
import moment from "moment";
import { Triangle } from "react-loader-spinner";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import config from "../config";

const DashboardPage = () => {
  const [orderCounts, setOrderCounts] = useState({
    today: 0,
    yesterday: 0,
    total: 0,
    onHold: 0,
    completed: 0,
  });
  const [orders, setOrders] = useState([]);
  const [dailyOrders, setDailyOrders] = useState([]);
  const [todayCourierCounts, setTodayCourierCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [packedPersons, setPackedPersons] = useState([]);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const token = Cookies.get("token");
    const userName = Cookies.get("userName");

    if (!token || !userName) {
      navigate("/");
      return;
    }

    const fetchOrders = async () => {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/all-orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const orders = response.data.orders || [];
        updateOrderData(orders);
      } catch (error) {
        console.error("Failed to fetch orders", error);
        if (error.response?.status === 401) {
          Cookies.remove("token");
          Cookies.remove("userName");
          Cookies.remove("userDetails");
          navigate("/");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    const socket = io(config.websocketUrl);
    socket.on("orderUpdated", (updatedOrder) => {
      setOrders((prevOrders) => {
        const updatedOrders = prevOrders.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order
        );
        updateOrderData(updatedOrders);
        return updatedOrders;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [navigate]);

  const updateOrderData = (orders) => {
    const today = moment().startOf("day");
    const yesterday = moment().subtract(1, "days").startOf("day");

    const counts = orders.reduce(
      (acc, order) => {
        const orderDate = moment(order.order_date);
        if (orderDate.isSame(today, "day")) acc.today += 1;
        else if (orderDate.isSame(yesterday, "day")) acc.yesterday += 1;
        if (order.packed_status === "Hold") acc.onHold += 1;
        if (order.packed_status === "Completed") acc.completed += 1;
        acc.total += 1;
        return acc;
      },
      { today: 0, yesterday: 0, total: 0, onHold: 0, completed: 0 }
    );

    setOrderCounts(counts);
    setOrders(orders);

    const dailyCounts = [];
    for (let i = 6; i >= 0; i--) {
      const day = moment().subtract(i, "days").startOf("day");
      const count = orders.filter((order) => moment(order.order_date).isSame(day, "day")).length;
      dailyCounts.push({ day: day.format("MMM"), count });
    }
    setDailyOrders(dailyCounts);

    const packedData = orders.reduce((acc, order) => {
      const personName =
        order.packed_person_name?.trim() === "Unknown" || !order.packed_person_name?.trim()
          ? "Pending Orders"
          : order.packed_person_name.trim();
      acc[personName] = (acc[personName] || 0) + 1;
      return acc;
    }, {});

    const packedPersonsArray = Object.entries(packedData).map(([name, count]) => ({ name, count }));
    setPackedPersons(packedPersonsArray);

    const todayOrders = orders.filter((order) => moment(order.order_date).isSame(today, "day"));
    const courierData = todayOrders.reduce((acc, order) => {
      if (order.shipments && order.shipments.length > 0) {
        const uniqueCouriers = [
          ...new Set(order.shipments.map((shipment) => shipment.courier_name?.trim()).filter(Boolean)),
        ];
        uniqueCouriers.forEach((courier) => {
          acc[courier] = (acc[courier] || 0) + 1;
        });
      }
      return acc;
    }, {});

    const todayCourierCountsArray = Object.entries(courierData)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    setTodayCourierCounts(todayCourierCountsArray);
  };

  const percentageChange = (current, reference) => {
    if (reference === 0) return "+0%";
    const change = ((current - reference) / reference) * 100;
    return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
  };

  const pieData = [
    { name: "Completed", value: orders.filter((order) => order.packed_status === "Completed").length },
    { name: "On Hold", value: orders.filter((order) => order.packed_status === "Hold").length },
    { name: "Pending", value: orders.filter((order) => order.packed_status === "Pending").length },
  ];

  const COLORS = ["#22C55E", "#A855F7", "#FF6B6B"];

  const themes = {
    dark: {
      background: "#1B254B",
      cardBackground: "#252D5A",
      textPrimary: "#FFFFFF",
      textSecondary: "#A0AEC0",
      borderColor: "#4A5568",
      buttonBackground: "#1B254B",
      chartAxisColor: "#A0AEC0",
      tooltipBackground: "#1B254B",
    },
    light: {
      background: "#F7FAFC",
      cardBackground: "#FFFFFF",
      textPrimary: "#1A202C",
      textSecondary: "#718096",
      borderColor: "#E2E8F0",
      buttonBackground: "#EDF2F7",
      chartAxisColor: "#718096",
      tooltipBackground: "#FFFFFF",
    },
  };

  const currentTheme = themes[theme];

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: currentTheme.background }}>
        <Triangle visible={true} height="80" width="80" color="#22B8CF" ariaLabel="triangle-loading" />
      </div>
    );
  }

  return (
    <div style={{ background: currentTheme.background, minHeight: "100vh", padding: "30px 15px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", color: currentTheme.textPrimary, marginBottom: "4px" }}>
            Dashboard
          </h1>
          <p style={{ fontSize: "14px", color: currentTheme.textSecondary, marginBottom: "0" }}>
            Welcome back, {Cookies.get("userName")}!
          </p>
        </div>
        <Button
          onClick={toggleTheme}
          style={{
            background: currentTheme.buttonBackground,
            border: "none",
            borderRadius: "8px",
            padding: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {theme === "dark" ? (
            <FaSun size={20} color={currentTheme.textSecondary} />
          ) : (
            <FaMoon size={20} color={currentTheme.textSecondary} />
          )}
        </Button>
      </div>

      {/* Stat Cards */}
      <Row gutter={[8, 8]} style={{ marginBottom: "16px" }}>
        <Col xs={12} sm={12} md={6}>
          <Card
            style={{
              background: currentTheme.cardBackground,
              borderRadius: "12px",
              border: "none",
              padding: "10px",
              color: currentTheme.textPrimary,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <FaCalendarDay size={18} color="#22B8CF" />
              <Badge color="#22B8CF" text="Today" style={{ color: currentTheme.textSecondary, fontSize: "10px", fontWeight: "500" }} />
            </div>
            <h3 style={{ fontSize: "12px", color: currentTheme.textSecondary, marginBottom: "4px" }}>Today Orders</h3>
            <p style={{ fontSize: "20px", fontWeight: "bold", color: currentTheme.textPrimary, marginBottom: "4px" }}>
              {orderCounts.today}
            </p>
            <p style={{ fontSize: "10px", color: orderCounts.today >= orderCounts.yesterday ? "#22C55E" : "#FF6B6B" }}>
              {percentageChange(orderCounts.today, orderCounts.yesterday)} since yesterday
            </p>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <Card
            style={{
              background: currentTheme.cardBackground,
              borderRadius: "12px",
              border: "none",
              padding: "10px",
              color: currentTheme.textPrimary,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <FaCalendarMinus size={18} color="#FF6B6B" />
              <Badge color="#FF6B6B" text="Yesterday" style={{ color: currentTheme.textSecondary, fontSize: "10px", fontWeight: "500" }} />
            </div>
            <h3 style={{ fontSize: "12px", color: currentTheme.textSecondary, marginBottom: "4px" }}>Yesterday Orders</h3>
            <p style={{ fontSize: "20px", fontWeight: "bold", color: currentTheme.textPrimary, marginBottom: "4px" }}>
              {orderCounts.yesterday}
            </p>
            <p style={{ fontSize: "10px", color: orderCounts.yesterday >= orderCounts.today ? "#22C55E" : "#FF6B6B" }}>
              {percentageChange(orderCounts.yesterday, orderCounts.today)} compared to today
            </p>
          </Card>
        </Col>

        <Col xs={12} sm={12} md={6}>
          <Card
            style={{
              background: currentTheme.cardBackground,
              borderRadius: "12px",
              border: "none",
              padding: "10px",
              color: currentTheme.textPrimary,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <FaPauseCircle size={18} color="#A855F7" />
              <Badge color="#A855F7" text="On Hold" style={{ color: currentTheme.textSecondary, fontSize: "10px", fontWeight: "500" }} />
            </div>
            <h3 style={{ fontSize: "12px", color: currentTheme.textSecondary, marginBottom: "4px" }}>Orders on Hold</h3>
            <p style={{ fontSize: "20px", fontWeight: "bold", color: currentTheme.textPrimary, marginBottom: "4px" }}>
              {orderCounts.onHold}
            </p>
            <p style={{ fontSize: "10px", color: "#FF6B6B" }}>
              {percentageChange(orderCounts.onHold, orderCounts.total)} of total orders
            </p>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card
            style={{
              background: currentTheme.cardBackground,
              borderRadius: "12px",
              border: "none",
              padding: "10px",
              color: currentTheme.textPrimary,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <FaCheckCircle size={18} color="#22C55E" />
              <Badge color="#22C55E" text="Completed" style={{ color: currentTheme.textSecondary, fontSize: "10px", fontWeight: "500" }} />
            </div>
            <h3 style={{ fontSize: "12px", color: currentTheme.textSecondary, marginBottom: "4px" }}>Completed Orders</h3>
            <p style={{ fontSize: "20px", fontWeight: "bold", color: currentTheme.textPrimary, marginBottom: "4px" }}>
              {orderCounts.completed}
            </p>
            <p style={{ fontSize: "10px", color: "#22C55E" }}>
              {percentageChange(orderCounts.completed, orderCounts.total)} of total orders
            </p>
          </Card>
        </Col>
      </Row>

      {/* Charts and Tables */}
      <Row gutter={[8, 8]} style={{ marginBottom: "16px" }}>
        <Col xs={24} md={16}>
          <Card
            style={{
              background: currentTheme.cardBackground,
              borderRadius: "12px",
              border: "none",
              padding: "10px",
              color: currentTheme.textPrimary,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <h3 style={{ fontSize: "14px", color: currentTheme.textPrimary, fontWeight: "600" }}>Sales Value</h3>
              <div>
                <Button
                  style={{
                    background: currentTheme.buttonBackground,
                    color: currentTheme.textSecondary,
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 6px",
                    fontSize: "10px",
                    marginRight: "4px",
                  }}
                >
                  Month
                </Button>
                <Button
                  style={{
                    background: currentTheme.buttonBackground,
                    color: currentTheme.textSecondary,
                    border: "none",
                    borderRadius: "6px",
                    padding: "4px 6px",
                    fontSize: "10px",
                  }}
                >
                  Week
                </Button>
              </div>
            </div>
            <LineChart width={window.innerWidth < 768 ? 300 : 500} height={200} data={dailyOrders}>
              <XAxis dataKey="day" stroke={currentTheme.chartAxisColor} />
              <YAxis stroke={currentTheme.chartAxisColor} />
              <Tooltip
                contentStyle={{
                  background: currentTheme.tooltipBackground,
                  border: "none",
                  borderRadius: "6px",
                  color: currentTheme.textPrimary,
                }}
                formatter={(value) => [value, "Orders"]}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#22B8CF"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            style={{
              background: currentTheme.cardBackground,
              borderRadius: "12px",
              border: "none",
              padding: "10px",
              color: currentTheme.textPrimary,
            }}
          >
            <h3 style={{ fontSize: "14px", color: currentTheme.textPrimary, fontWeight: "600", marginBottom: "6px" }}>
              Order Status
            </h3>
            <PieChart width={window.innerWidth < 768 ? 200 : 250} height={200}>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={window.innerWidth < 768 ? 60 : 80}
                fill="#8884d8"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: currentTheme.tooltipBackground,
                  border: "none",
                  borderRadius: "6px",
                  color: currentTheme.textPrimary,
                }}
                formatter={(value) => [value, "Orders"]}
              />
              <Legend wrapperStyle={{ color: currentTheme.textSecondary, fontSize: "10px" }} />
            </PieChart>
          </Card>
        </Col>
      </Row>

      <Row gutter={[8, 8]}>
        <Col xs={24} md={12}>
          <Card
            style={{
              background: currentTheme.cardBackground,
              borderRadius: "12px",
              border: "none",
              padding: "10px",
              color: currentTheme.textPrimary,
            }}
          >
            <h3 style={{ fontSize: "14px", color: currentTheme.textPrimary, fontWeight: "600", marginBottom: "6px" }}>
              Users
            </h3>
            <ul style={{ listStyleType: "none", padding: 0 }}>
              {packedPersons.map((person) => (
                <li
                  key={person.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: `1px solid ${currentTheme.borderColor}`,
                  }}
                >
                  <span style={{ fontSize: "12px", color: currentTheme.textSecondary }}>{person.name}</span>
                  <span style={{ fontSize: "12px", fontWeight: "bold", color: "#22B8CF" }}>
                    {person.count}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={12}>
          <Card
            style={{
              background: currentTheme.cardBackground,
              borderRadius: "12px",
              border: "none",
              padding: "10px",
              color: currentTheme.textPrimary,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <FaTruck size={20} color="#FFA500" style={{ marginRight: "6px" }} />
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: currentTheme.textPrimary, margin: 0 }}>
                  Today’s Orders by Courier
                </h3>
              </div>
              <Badge
                color="#FFA500"
                text="Today"
                style={{ color: currentTheme.textSecondary, fontSize: "10px", fontWeight: "500", background: currentTheme.buttonBackground, padding: "2px 4px", borderRadius: "4px" }}
              />
            </div>
            <ul style={{ listStyleType: "none", padding: 0, maxHeight: "200px", overflowY: "auto" }}>
              {todayCourierCounts.length > 0 ? (
                todayCourierCounts.map((courier) => (
                  <li
                    key={courier.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 8px",
                      marginBottom: "4px",
                      background: currentTheme.cardBackground === "#FFFFFF" ? "#F9FAFB" : "#2D3748",
                      borderRadius: "6px",
                    }}
                  >
                    <span style={{ fontSize: "12px", fontWeight: "500", color: currentTheme.textPrimary, flex: 1 }}>
                      {courier.name || "Unknown"}
                    </span>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", fontWeight: "bold", color: "#FFA500", marginRight: "6px" }}>
                        {courier.count}
                      </span>
                      <Badge
                        count={courier.count}
                        style={{ backgroundColor: "#FFA500", color: "#FFF", fontSize: "10px", padding: "0 4px", borderRadius: "10px" }}
                      />
                    </div>
                  </li>
                ))
              ) : (
                <li style={{ fontSize: "12px", color: currentTheme.textSecondary, textAlign: "center", padding: "8px 0" }}>
                  No courier data for today
                </li>
              )}
            </ul>
            {todayCourierCounts.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", marginTop: "6px", borderTop: `1px solid ${currentTheme.borderColor}` }}>
                <span style={{ fontSize: "12px", fontWeight: "600", color: currentTheme.textPrimary }}>Total</span>
                <span style={{ fontSize: "12px", fontWeight: "bold", color: "#FFA500" }}>
                  {todayCourierCounts.reduce((sum, courier) => sum + courier.count, 0)}
                </span>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
