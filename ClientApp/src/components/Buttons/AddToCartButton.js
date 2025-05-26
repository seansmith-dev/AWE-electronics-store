import React from 'react'
import './AddToCartButton.css'
import { useNavigate } from 'react-router-dom';

const AddToCartButton = (props) => {
  const navigate = useNavigate();

  const handleClick = (event) => {

    if (props.onClick) {
      props.onClick(event); // Call the passed-in onClick function (e.g., handleAddMember)
    }
    if (props.buttonNavigateTo) {
      navigate(props.buttonNavigateTo); 
    }
  };

  return (

    <button className={`btn btn--${props.buttonType} btn--${props.buttonSize} card--${props.buttonCardNo} btn--${props.buttonWidth} ${props.className}`} onClick={handleClick}>{props.buttonText}</button>
        
  )
}

export default AddToCartButton