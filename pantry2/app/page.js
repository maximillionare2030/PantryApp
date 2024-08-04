'use client';

import { useState, useEffect } from 'react';
import { Box, Stack, Typography, Button, Modal, TextField, Tooltip, Grid } from '@mui/material';
import axios from 'axios';
import { firestore, storage } from '@/firebase'; // Ensure the correct path here
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  deleteDoc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'white',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  justifyContent: 'center',
  alignItems: 'center',
};

const uploadImage = async (imageFile) => {
  if (!storage) {
    throw new Error('Firebase storage is not initialized.');
  }

  try {
    const storageRef = ref(storage, `images/${imageFile.name}`); // Create a reference to the storage location

    await uploadBytes(storageRef, imageFile); // Upload the file

    const imageUrl = await getDownloadURL(storageRef); // Get the download URL
    return imageUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [itemImage, setItemImage] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);

  const updateInventory = async () => {
    const snapshot = query(collection(firestore, 'inventory'));
    const docs = await getDocs(snapshot);
    const inventoryList = [];
    docs.forEach((doc) => {
      inventoryList.push({ 
        name: doc.id, 
        ...doc.data(), 
      });
    });
    setInventory(inventoryList);
  };

  useEffect(() => {
    updateInventory();
  }, []);

  const addItem = async (item, quantity, image) => {
    if (typeof window !== 'undefined') {
      const docRef = doc(collection(firestore, 'inventory'), item);
      const docSnap = await getDoc(docRef);
      const currentTime = Timestamp.now();
      let imageURL = '';

      if (image) {
        imageURL = await uploadImage(image);
      }

      const newEntry = {
        quantity,
        imageURL,
        timestamp: currentTime,
      };

      if (docSnap.exists()) {
        const existingData = docSnap.data();
        const entries = existingData.entries ? [...existingData.entries, newEntry] : [newEntry];
        await setDoc(docRef, {
          quantity: existingData.quantity + quantity,
          entries,
        }, { merge: true });
      } else {
        await setDoc(docRef, {
          quantity,
          entries: [newEntry],
        });
      }
      await updateInventory();
    }
  };

  const removeItem = async (item) => {
    if (typeof window !== 'undefined') {
      const docRef = doc(collection(firestore, 'inventory'), item);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const { quantity, entries = [] } = docSnap.data(); // Default entries to an empty array
        if (quantity === 1) {
          await deleteDoc(docRef);
        } else if (entries.length > 0) {
          let updatedEntries = [...entries];
          // Find the first entry with a quantity greater than 1 and decrement its quantity
          for (let i = 0; i < updatedEntries.length; i++) {
            if (updatedEntries[i].quantity > 1) {
              updatedEntries[i].quantity -= 1;
              break;
            } else if (updatedEntries[i].quantity === 1) {
              // If the entry has a quantity of 1, remove it
              updatedEntries.splice(i, 1);
              break;
            }
          }
          await setDoc(docRef, { quantity: quantity - 1, entries: updatedEntries }, { merge: true });
        }
      }
      await updateInventory();
    }
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleSearchInput = (e) => {
    setSearchInput(e.target.value);
    
    if (e.target.value === '') {
      setSearchResults([]);
    } else {
      const results = inventory.filter((item) =>
        item.name.toLowerCase().includes(e.target.value.toLowerCase())
      );
      setSearchResults(results);
    }
  }
  const handleChatInputChange = (e) => setChatInput(e.target.value);

  const sendMessage = async () => {
    if (chatInput.trim() === '') return;

    setChatMessages((prevMessages) => [
      ...prevMessages,
      { role: 'user', content: chatInput }
    ]);

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            ...chatMessages,
            { role: 'user', content: chatInput }
          ],
        },
        { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
      );

      const { choices } = response.data;
      const assistantMessage = choices[0].message;

      setChatMessages((prevMessages) => [
        ...prevMessages,
        assistantMessage
      ]);

      setChatInput('');
    } catch (error) {
      console.warn('Error communicating with OpenAI:', error);
    }
  };

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap={2}
    >
      <Modal 
        open={open} 
        onClose={handleClose} 
        aria-labelledby="modal-modal-title" 
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Typography id="modal-modal-title" variant="h6" component="h2" color="black">
            Add Item
          </Typography>
          <Stack width="100%" direction="column" spacing={2}>
            <TextField
              id="outlined-basic"
              label="Item"
              variant="outlined"
              fullWidth
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              sx={{ marginBottom: 2 }}
            />
            <TextField
              type="number"
              label="Quantity"
              variant="outlined"
              fullWidth
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              sx={{ marginBottom: 2 }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 2 }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setItemImage(e.target.files[0])} // Handle image selection
                style={{ flex: 1 }}
              />
            </Box>
            <Button
              variant="outlined"
              onClick={async () => {
                try { 
                  await addItem(itemName, quantity, itemImage);
                  setItemName('');
                  setQuantity(1);
                  setItemImage(null);
                  handleClose();
                } catch (error) {
                  console.error("Error adding item:", error);
                }
              }}
              sx={{ alignSelf: 'center', width: 'fit-content' }}
            >
              Add
            </Button>
          </Stack>
        </Box>
      </Modal>
      <Box display="flex" alignItems="center" flexDirection={"column"} paddingLeft={"10px"} justifyContent="center">
        <Box display="flex" flexDirection="column" alignItems="center" gap={2} backgroundColor="white" marginBottom={"10px"}>
          <TextField
            id="search-bar"
            label="Search Items"
            variant="outlined"
            value={searchInput}
            onChange={handleSearchInput}
            fullWidth
          />
        </Box>

        <Button variant="contained" onClick={handleOpen} marginTop="10px">
          Add New Item
        </Button>

        <Box border="5px solid #333" marginTop={2}>
          <Box
            width="600px"
            height="100px"
            bgcolor="white"
            display="flex"
            justifyContent="center"
            alignItems="center"
          >
            <Typography variant="h2" color="#333" textAlign="center">
              Inventory Items
            </Typography>
          </Box>
          <Stack width="600px" height="500px" spacing={2} overflow="auto" bgcolor="white">
            {(searchResults.length > 0 ? searchResults : inventory).map(({ name, quantity }) => (
              <Box
                key={name}
                width="100%"
                minHeight="150px"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                bgcolor="#f0f0f0"
                paddingX={5}
              >
                <Typography variant="h3" color="#333" textAlign="center">
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </Typography>
                <Typography variant="h6" color="#333" textAlign="center">
                  Quantity: {quantity}
                </Typography>
                <Button variant="contained" onClick={() => removeItem(name)}>
                  Remove
                </Button>
              </Box>
            ))}
          </Stack>
        </Box>
      </Box>

      <Box 
        width="30%" 
        height="80%" 
        marginLeft="40px" 
        marginRight="40px" 
        border="5px solid black"
        sx={{
          backgroundImage: 'url(/emptyshelf.jpg)', // Replace with your image URL
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          overflowX: 'auto'
        }}
      >
        <Box display="flex" justifyContent="center" alignContent="center" borderBottom="5px solid black" bgcolor="white">
          <Typography variant="h2" marginBottom={2} color="black">
            Pantry Visual
          </Typography>
        </Box>
        <Stack spacing={2} padding={2} overflow="auto">
          {(searchResults.length > 0 ? searchResults : inventory).map(({ name, entries }) => (
            <Box key={name} marginBottom={2}>
              <Tooltip
                title={`Total Quantity: ${entries.reduce((sum, entry) => sum + entry.quantity, 0)}`}
                arrow
                placement="top"
              >
                <Typography variant="h6" color="white" textAlign="center" marginBottom={1}>
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </Typography>
              </Tooltip>
              <Grid container spacing={1} sx={{ marginTop: 2 }}>
                {entries.flatMap((entry) =>
                  Array(entry.quantity).fill().map((_, idx) => (
                    <Grid key={`${entry.timestamp.toMillis()}-${idx}`} item>
                      <Tooltip
                        title={`Entered: ${entry.timestamp.toDate().toLocaleString()}`}
                        arrow
                        placement="top"
                      >
                        <Box
                          width={50}
                          height={50}
                          bgcolor="#e0e0e0"
                          border="1px solid #333"
                          display="flex"
                          justifyContent="center"
                          alignItems="center"
                        >
                          <Typography variant="body2" color="#333">
                            {name.charAt(0).toUpperCase()}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </Grid>
                  ))
                )}
              </Grid>
            </Box>
          ))}
        </Stack>
      </Box>
      <Box display="flex" alignItems="center" flexDirection={"column"} justifyContent="center">
        <Typography variant="h4" marginBottom={2}>
          Chat with PantryAI
        </Typography>
        <Box
          display="flex"
          flexDirection="column"
          width="100%"
          maxWidth="600px"
          padding={2}
          border="2px solid #333"
          borderRadius="8px"
          bgcolor="white"
          overflow="auto"
          minHeight={"500px"}
          maxHeight={"500px"}
        >
          {chatMessages.map((msg, index) => (
            <Typography
              key={index}
              align={msg.role === 'user' ? 'left' : 'right'}
              style={{
                margin: '10px 0',
                backgroundColor: msg.role === 'user' ? '#e0e0e0' : '#c0c0c0',
                padding: '10px',
                borderRadius: '10px'
              }}
            >
              {msg.content}
            </Typography>
          ))}
        </Box>
        <Box display="flex" width="100%" maxWidth="600px" gap={2} marginTop={2}>
          <Box bgcolor={'white'} display="flex" border="3px solid grey">
            <TextField
              variant="outlined"
              width="100%"
              label="Type your message..."
              value={chatInput}
              onChange={handleChatInputChange}
              backgroundColor="white"
            />
            <Button variant="contained" onClick={sendMessage}>
              Send
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}