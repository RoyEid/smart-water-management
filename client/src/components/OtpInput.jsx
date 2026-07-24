import { useRef } from "react";

const CODE_LENGTH = 6;

function OtpInput({
  value,
  onChange,
  disabled = false,
}) {
  const inputReferences = useRef([]);

  function focusInput(index) {
    const safeIndex = Math.max(
      0,
      Math.min(index, CODE_LENGTH - 1),
    );

    inputReferences.current[safeIndex]?.focus();
    inputReferences.current[safeIndex]?.select();
  }

  function handleChange(index, inputValue) {
    const numbers = inputValue
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);

    const updatedCode = [...value];

    if (!numbers) {
      updatedCode[index] = "";
      onChange(updatedCode);
      return;
    }

    numbers.split("").forEach((number, offset) => {
      const targetIndex = index + offset;

      if (targetIndex < CODE_LENGTH) {
        updatedCode[targetIndex] = number;
      }
    });

    onChange(updatedCode);

    const nextIndex = Math.min(
      index + numbers.length,
      CODE_LENGTH - 1,
    );

    focusInput(nextIndex);
  }

  function handleKeyDown(index, event) {
    if (event.key === "Backspace") {
      event.preventDefault();

      const updatedCode = [...value];

      if (updatedCode[index]) {
        updatedCode[index] = "";
        onChange(updatedCode);
        focusInput(index);
      } else if (index > 0) {
        updatedCode[index - 1] = "";
        onChange(updatedCode);
        focusInput(index - 1);
      }
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
    }

    if (
      event.key === "ArrowRight" &&
      index < CODE_LENGTH - 1
    ) {
      event.preventDefault();
      focusInput(index + 1);
    }
  }

  function handlePaste(event) {
    event.preventDefault();

    const pastedCode = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODE_LENGTH);

    if (!pastedCode) {
      return;
    }

    const updatedCode = Array(CODE_LENGTH).fill("");

    pastedCode.split("").forEach((number, index) => {
      updatedCode[index] = number;
    });

    onChange(updatedCode);

    focusInput(
      Math.min(pastedCode.length, CODE_LENGTH - 1),
    );
  }

  return (
    <div
      className="flex justify-between gap-2"
      onPaste={handlePaste}
      aria-label="Six-digit verification code"
    >
      {value.map((number, index) => (
        <input
          key={index}
          ref={(element) => {
            inputReferences.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={number}
          disabled={disabled}
          autoFocus={index === 0}
          autoComplete={
            index === 0 ? "one-time-code" : "off"
          }
          aria-label={`Verification digit ${index + 1}`}
          className="otp-input disabled:cursor-not-allowed disabled:opacity-60"
          onChange={(event) =>
            handleChange(index, event.target.value)
          }
          onKeyDown={(event) =>
            handleKeyDown(index, event)
          }
          onFocus={(event) => event.target.select()}
        />
      ))}
    </div>
  );
}

export default OtpInput;