import React from 'react';
import styled from 'styled-components';
import { Typography, Button, Table, Input, Modal, Form, Tooltip, Tag, Drawer, Radio } from 'antd';
import {
  DeleteOutlined, SafetyCertificateOutlined, UserAddOutlined, GoogleOutlined, SyncOutlined, QuestionOutlined,
  SearchOutlined,
  UserOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { withRouter } from 'react-router-dom';
import { Space, Pagination } from 'antd';
import { searchOrgClientUsers, deleteUser, setPasswordForUser, setUserTags } from 'services/userService';
import { inviteUser$, impersonate$, inviteClient } from 'services/authService';
import { TimeAgo } from 'components/TimeAgo';
import { FaTheaterMasks } from 'react-icons/fa';
import { reactLocalStorage } from 'reactjs-localstorage';
import { GlobalContext } from 'contexts/GlobalContext';
import ProfileForm from 'pages/Profile/ProfileForm';
import HighlightingText from 'components/HighlightingText';
import CheckboxButton from 'components/CheckboxButton';
import TagSelect from 'components/TagSelect';
import { listUserTags, saveUserTag } from 'services/userTagService';
import ReactDOM from 'react-dom';
import TagFilter from 'components/TagFilter';
import DropdownMenu from 'components/DropdownMenu';
import { notify } from 'util/notify';
import { UserNameLabel } from 'components/UserNameLabel';


const { Text, Paragraph } = Typography;

const ContainerStyled = styled.div`
`;

const DEFAULT_QUERY_INFO = {
  text: '',
  tags: [],
  page: 1,
  size: 50,
  orderField: 'createdAt',
  orderDirection: 'DESC'
};

const LOCAL_STORAGE_KEY = 'user_query';

const ClientUserListPage = () => {

  const [profileModalVisible, setProfileModalVisible] = React.useState(false);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [setPasswordVisible, setSetPasswordVisible] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState();
  const [list, setList] = React.useState([]);
  const [tags, setTags] = React.useState([]);
  const [inviteVisible, setInviteVisible] = React.useState(false);
  const context = React.useContext(GlobalContext);
  const [queryInfo, setQueryInfo] = React.useState(reactLocalStorage.getObject(LOCAL_STORAGE_KEY, DEFAULT_QUERY_INFO, true))
  const [inviteForm] = Form.useForm();

  const handleTagChange = async (user, tags) => {
    await setUserTags(user.id, tags);
  }

  const isSystem = context.role === 'system';
  const isAdmin = context.role === 'admin';

  const columnDef = [
    {
      // title: 'User',
      fixed: 'left',
      render: (text, item) => <UserNameLabel userId={item.id} profile={item} />,
    },
    // {
    //   title: 'Login Type',
    //   dataIndex: 'loginType',
    //   render: (text) => text === 'local' ? <Tag color="#333333">Local</Tag> : <Tag icon={<GoogleOutlined />} color="#4c8bf5">Google</Tag>
    // },
    {
      title: 'Tags',
      dataIndex: 'tags',
      render: (value, item) => <TagSelect tags={tags} onSave={saveUserTag} value={value} onChange={tags => handleTagChange(item, tags)} />
    },
    {
      // title: 'Action',
      // fixed: 'right',
      // width: 200,
      align: 'right',
      fixed: 'right',
      render: (text, user) => {
        return (
          <DropdownMenu
            config={[
              {
                menu: 'Active tasks',
                onClick: () => openProfileModal(user)
              },
              {
                menu: 'Resend invite',
                onClick: () => openProfileModal(user)
              },
              {
                menu: 'Portfolios',
                onClick: () => openProfileModal(user)
              },
              {
                menu: 'Tags',
                onClick: () => openProfileModal(user)
              },
            ]}
          />
        )
      },
    },
  ].filter(x => !!x);

  const loadList = async () => {
    try {
      setLoading(true);
      await searchByQueryInfo(queryInfo)
      const tags = await listUserTags();
      setTags(tags);
    } catch {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadList();
  }, []);

  const updateQueryInfo = (queryInfo) => {
    reactLocalStorage.setObject(LOCAL_STORAGE_KEY, queryInfo);
    setQueryInfo(queryInfo);
  }

  const handleSearchTextChange = text => {
    const newQueryInfo = {
      ...queryInfo,
      text
    }
    updateQueryInfo(newQueryInfo);
    // await loadTaskWithQuery(newQueryInfo);
  }

  const handleSearch = async (value) => {
    const text = value?.trim();

    const newQueryInfo = {
      ...queryInfo,
      text
    }

    await loadList(newQueryInfo);
  }

  const searchByQueryInfo = async (queryInfo) => {
    try {
      setLoading(true);
      const resp = await searchOrgClientUsers(queryInfo);
      const { count, page, data } = resp;
      ReactDOM.unstable_batchedUpdates(() => {
        setTotal(count);
        setList(data);
        setQueryInfo({ ...queryInfo, page });
        setLoading(false);
      });
      reactLocalStorage.setObject(LOCAL_STORAGE_KEY, queryInfo);
    } catch {
      setLoading(false);
    }
  }

  const handleDelete = async (item) => {
    const { id, email } = item;
    Modal.confirm({
      title: <>Delete user</>,
      content: <>Delete user <Text code>{email}</Text>?</>,
      onOk: async () => {
        setLoading(true);
        await deleteUser(id);
        await searchByQueryInfo(queryInfo);
      },
      maskClosable: true,
      okButtonProps: {
        danger: true
      },
      okText: 'Yes, delete it!'
    });
  }

  const handleImpersonante = async (item) => {
    Modal.confirm({
      title: 'Impersonate',
      icon: <QuestionOutlined />,
      content: <>To impersonate user <Text code>{item.email}</Text></>,
      okText: 'Yes, impersonate',
      maskClosable: true,
      onOk: () => {
        impersonate$(item.email)
          .subscribe(() => {
            reactLocalStorage.clear();
            window.location = '/';
          });
      }
    })
  }


  const openSetPasswordModal = async (user) => {
    setSetPasswordVisible(true);
    setCurrentUser(user);
  }

  const openProfileModal = async (user) => {
    setProfileModalVisible(true);
    setCurrentUser(user);
  }

  const handleSetPassword = async (id, values) => {
    setLoading(true);
    await setPasswordForUser(id, values.password);
    setSetPasswordVisible(false);
    setCurrentUser(undefined);
    setLoading(false);
  }

  const handleNewUser = () => {
    setInviteVisible(true);
  }

  const handleInviteUser = async values => {
    const { email } = values;
    await inviteClient(email);
    notify.success(<>Successfully sent out the invite to user <strong>{email}</strong></>);
    inviteForm.current.resetFields();
  }

  const handleTagFilterChange = (tags) => {
    searchByQueryInfo({ ...queryInfo, page: 1, tags });
  }

  const handleClearFilter = () => {
    searchByQueryInfo(DEFAULT_QUERY_INFO);
  }

  const handlePaginationChange = (page, pageSize) => {
    searchByQueryInfo({ ...queryInfo, page, size: pageSize });
  }

  return (
    <ContainerStyled>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Input.Search
            placeholder="Search name or email"
            enterButton={<SearchOutlined />}
            onSearch={value => handleSearch(value)}
            onPressEnter={e => handleSearch(e.target.value)}
            onChange={e => handleSearchTextChange(e.target.value)}
            loading={loading}
            value={queryInfo?.text}
            allowClear
          />
          <Space>
            <Button danger ghost onClick={() => handleClearFilter()} icon={<ClearOutlined />}>Clear Filter</Button>
            <Button type="primary" onClick={() => handleNewUser()} icon={<UserAddOutlined />}>Add Portfolio</Button>
            <Button type="primary" ghost onClick={() => loadList()} icon={<SyncOutlined />}></Button>
          </Space>
        </Space>
        {tags && <TagFilter value={queryInfo.tags} onChange={handleTagFilterChange} tags={tags} />}
        <Table columns={columnDef}
          dataSource={list}
          size="small"
          scroll={{
            x: 'max-content'
          }}
          // scroll={{x: 1000}}
          rowKey="id"
          loading={loading}
          style={{ marginTop: 20 }}
          pagination={{
            current: queryInfo.current,
            pageSize: queryInfo.size,
            total: total,
            showTotal: total => `Total ${total}`,
            pageSizeOptions: [10, 30, 60],
            showSizeChanger: true,
            showQuickJumper: true,
            disabled: loading,
            onChange: handlePaginationChange,
            onShowSizeChange: (page, size) => {
              searchByQueryInfo({ ...queryInfo, page, size });
            }
          }}
        />
      </Space>
      <Modal
        visible={setPasswordVisible}
        destroyOnClose={true}
        maskClosable={false}
        onOk={() => setSetPasswordVisible(false)}
        onCancel={() => setSetPasswordVisible(false)}
        title={<>Reset Password</>}
        footer={null}
        width={400}
      >
        <Form layout="vertical" onFinish={values => handleSetPassword(currentUser?.id, values)}>
          <Space style={{ justifyContent: 'center', width: '100%' }}>
            <Paragraph code>{currentUser?.email}</Paragraph>
          </Space>
          <Form.Item label="Password" name="password" rules={[{ required: true, message: ' ' }]}>
            <Input placeholder="New password" autoFocus autoComplete="new-password" disabled={loading} />
          </Form.Item>
          <Form.Item>
            <Button block type="primary" htmlType="submit" disabled={loading}>Reset Password</Button>
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        visible={inviteVisible}
        destroyOnClose={true}
        maskClosable={false}
        onOk={() => setInviteVisible(false)}
        onCancel={() => setInviteVisible(false)}
        title={<>Invite Client</>}
        footer={null}
        width={500}
      >
        <Paragraph>System will send an invitation to the email address if the email address hasn't signed up before.</Paragraph>
        <Form ref={inviteForm} layout="vertical" onFinish={handleInviteUser}>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', whitespace: true, max: 100, message: ' ' }]}>
            <Input placeholder="abc@xyz.com" type="email" autoComplete="email" allowClear={true} maxLength="100" autoFocus={true} />
          </Form.Item>
          <Form.Item label="Tags" name="tags">
            <TagSelect tags={tags} onSave={saveUserTag} />
          </Form.Item>
          <Form.Item>
            <Button block type="primary" htmlType="submit" disabled={loading}>Invite</Button>
          </Form.Item>
        </Form>
      </Modal>
      <Drawer
        visible={profileModalVisible}
        destroyOnClose={true}
        maskClosable={true}
        title="Update Profile"
        onClose={() => setProfileModalVisible(false)}
        footer={null}
        width={400}
      >
        {/* <Alert style={{ marginBottom: '0.5rem' }} type="warning" showIcon message="Changing email will change the login account. After changing, system will send out a new invitation to the new email address to reset your password." /> */}

        {currentUser && <ProfileForm user={currentUser} onOk={() => setProfileModalVisible(false)} refreshAfterLocaleChange={false} />}
      </Drawer>
    </ContainerStyled>

  );
};

ClientUserListPage.propTypes = {};

ClientUserListPage.defaultProps = {};

export default withRouter(ClientUserListPage);
