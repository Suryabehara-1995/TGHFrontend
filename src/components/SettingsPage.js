import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Form, Input, Button, message, Avatar, Space, Card, Row, Col, Modal, Typography, Select, Checkbox } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Triangle } from 'react-loader-spinner'; // Import the Triangle loader
import config from '../config';
import './SettingsPage.css';

const { Option } = Select;
const { Title, Text } = Typography;

const SettingsPage = ({ token, userName }) => {
  const [profile, setProfile] = useState({ name: '', email: '', role: 'Product Designer' });
  const [users, setUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true); // Add loading state
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    permissions: {
      dashboardAccess: false,
      syncAccess: false,
      ordersAccess: false,
      packingAccess: false,
      deliveryAccess: false,
      productsAccess: false,
      settingsAccess: false,
    },
  });
  const [editUser, setEditUser] = useState(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  useEffect(() => {
    setLoading(true); // Set loading to true when fetching starts
    axios.get(`${config.apiBaseUrl}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        setProfile(res.data);
        setIsAdmin(res.data.role === 'admin');
      })
      .catch((err) => {
        console.error('Failed to fetch profile:', err.response?.data || err.message);
        message.error('Failed to fetch profile');
      })
      .finally(() => {
        if (!isAdmin) {
          setLoading(false); // Stop loading if not admin
        }
      });

    if (isAdmin) {
      axios.get(`${config.apiBaseUrl}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => {
          setUsers(res.data);
        })
        .catch((err) => {
          console.error('Failed to fetch users:', err.response?.data || err.message);
          message.error('Failed to fetch users');
        })
        .finally(() => {
          setLoading(false); // Stop loading after fetching users
        });
    }
  }, [token, isAdmin]);

  const handleProfileUpdate = () => {
    axios.put(`${config.apiBaseUrl}/profile`, profile, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => {
        message.success('Profile updated successfully');
      })
      .catch((err) => {
        console.error('Failed to update profile:', err.response?.data || err.message);
        message.error('Failed to update profile');
      });
  };

  const handleCreateUser = () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      message.error('Name, email, and password are required');
      return;
    }
    axios.post(`${config.apiBaseUrl}/admin/users`, newUser, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        message.success('User created successfully');
        setUsers([...users, res.data.user]);
        setNewUser({
          name: '',
          email: '',
          password: '',
          role: 'user',
          permissions: {
            dashboardAccess: false,
            syncAccess: false,
            ordersAccess: false,
            packingAccess: false,
            deliveryAccess: false,
            productsAccess: false,
            settingsAccess: false,
          },
        });
        setCreateModalVisible(false);
      })
      .catch((err) => {
        const errorMessage = err.response?.data?.message || 'Failed to create user';
        console.error('Failed to create user:', err.response?.data || err.message);
        message.error(errorMessage);
      });
  };

  const handleEditUser = (user) => {
    setEditUser(user);
    setEditModalVisible(true);
  };

  const handleUpdateUser = () => {
    axios.put(`${config.apiBaseUrl}/admin/users/${editUser._id}`, editUser, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        message.success('User updated successfully');
        setUsers(users.map(user => user._id === editUser._id ? res.data.user : user));
        setEditModalVisible(false);
        setEditUser(null);
      })
      .catch((err) => {
        const errorMessage = err.response?.data?.message || 'Failed to update user';
        console.error('Failed to update user:', err.response?.data || err.message);
        message.error(errorMessage);
      });
  };

  const handleDeleteUser = (userId) => {
    axios.delete(`${config.apiBaseUrl}/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => {
        message.success('User deleted successfully');
        setUsers(users.filter(user => user._id !== userId));
      })
      .catch((err) => {
        const errorMessage = err.response?.data?.message || 'Failed to delete user';
        console.error('Failed to delete user:', err.response?.data || err.message);
        message.error(errorMessage);
      });
  };

  // Render loading screen if loading is true
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f medya5' }}>
        <Triangle visible={true} height="80" width="80" color="#22B8CF" ariaLabel="triangle-loading" />
      </div>
    );
  }

  return (
    <div style={{ padding: '15px' }} className="settings-container">
      <Title level={2} className="settings-title">
        Settings
      </Title>
      <Text className="settings-subtitle">{userName}'s Profile & User Management</Text>

      <Row gutter={[24, 24]}>
        {/* Profile Settings Section */}
        <Col xs={24} lg={12}>
          <Card className="profile-card" style={{ background: 'linear-gradient(135deg, #4B5EAA, #8F94FB)', height: '160px' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', padding: '16px' }}>
              <Avatar
                size={80}
                icon={<UserOutlined />}
                className="profile-avatar"
                style={{ marginRight: '16px', backgroundColor: '#fff', color: '#4B5EAA' }}
              />
              <div>
                <Title level={4} className="card-title" style={{ color: '#fff', margin: 0 }}>
                  {profile.name || 'User Name'}
                </Title>
                <Text className="card-subtitle" style={{ color: '#fff' }}>
                  {profile.role || 'Product Designer'}
                </Text>
              </div>
            </div>
            <Form layout="vertical" onFinish={handleProfileUpdate} style={{ padding: '16px' }}>
              <Form.Item label="Name" required>
                <Input
                  prefix={<UserOutlined className="input-icon" />}
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Enter your name"
                  className="custom-input"
                />
              </Form.Item>
              <Form.Item label="Email">
                <Input
                  prefix={<MailOutlined className="input-icon" />}
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  disabled
                  placeholder="Your email"
                  className="custom-input"
                />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  className="custom-button"
                >
                  Update Profile
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Manage Users Section with Create User Button */}
        {isAdmin && (
          <Col xs={24} lg={12}>
            <Card className="users-card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Title level={4} className="card-title">Manage Users</Title>
                  <Text className="card-subtitle">{users.length} Users</Text>
                </div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                  className="custom-button"
                >
                  Create User
                </Button>
              </div>
              <div className="users-list">
                {users.map((user, index) => (
                  <div key={index} className="user-item">
                    <Avatar
                      size={48}
                      icon={<UserOutlined />}
                      className="user-avatar"
                    />
                    <div className="user-info">
                      <Text className="user-name">{user.name}</Text>
                      <Text className="user-role">{user.role}</Text>
                    </div>
                    <Button
                      type="link"
                      icon={<EditOutlined />}
                      onClick={() => handleEditUser(user)}
                      className="edit-button"
                    >
                      Edit
                    </Button>
                    <Button
                      type="link"
                      danger
                      onClick={() => handleDeleteUser(user._id)}
                      className="delete-button"
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        )}
      </Row>

      {/* Edit User Modal */}
      <Modal
        title={<span className="modal-title">Edit User</span>}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleUpdateUser}
        width={600}
        style={{ top: 40 }}
        bodyStyle={{ padding: '24px' }}
      >
        {editUser && (
          <Form layout="vertical">
            <Form.Item label="Name">
              <Input
                value={editUser.name}
                onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                className="custom-input"
              />
            </Form.Item>
            <Form.Item label="Email">
              <Input
                value={editUser.email}
                onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                disabled
                className="custom-input"
              />
            </Form.Item>
            <Form.Item label="Role">
              <Select
                value={editUser.role}
                onChange={(value) => setEditUser({ ...editUser, role: value })}
                className="custom-select"
              >
                <Option value="user">User</Option>
                <Option value="admin">Admin</Option>
              </Select>
            </Form.Item>
            <Form.Item label="Permissions">
              <div className="permissions-box">
                <Space size="large" wrap>
                  {Object.keys(editUser.permissions).map((perm) => (
                    <Checkbox
                      key={perm}
                      checked={editUser.permissions[perm]}
                      onChange={(e) =>
                        setEditUser({
                          ...editUser,
                          permissions: { ...editUser.permissions, [perm]: e.target.checked },
                        })
                      }
                    >
                      {perm.replace('Access', ' ').trim()}
                    </Checkbox>
                  ))}
                </Space>
              </div>
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Create User Modal */}
      <Modal
        title={<span className="modal-title">Create New User</span>}
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={handleCreateUser}
        width={900}
        style={{ top: 40 }}
        bodyStyle={{ padding: '24px' }}
      >
        <Form layout="vertical">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Form.Item label="Name" required>
                <Input
                  prefix={<UserOutlined className="input-icon" />}
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Enter user name"
                  className="custom-input"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Email" required>
                <Input
                  prefix={<MailOutlined className="input-icon" />}
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="Enter user email"
                  className="custom-input"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Password" required>
                <Input.Password
                  prefix={<LockOutlined className="input-icon" />}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Enter password"
                  className="custom-input"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Form.Item label="Role">
                <Select
                  value={newUser.role}
                  onChange={(value) => setNewUser({ ...newUser, role: value })}
                  className="custom-select"
                >
                  <Option value="user">User</Option>
                  <Option value="admin">Admin</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={16}>
              <Form.Item label="Permissions">
                <div className="permissions-box">
                  <Space size="large" wrap>
                    {Object.keys(newUser.permissions).map((perm) => (
                      <Checkbox
                        key={perm}
                        checked={newUser.permissions[perm]}
                        onChange={(e) =>
                          setNewUser({
                            ...newUser,
                            permissions: { ...newUser.permissions, [perm]: e.target.checked },
                          })
                        }
                      >
                        {perm.replace('Access', ' ').trim()}
                      </Checkbox>
                    ))}
                  </Space>
                </div>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default SettingsPage;