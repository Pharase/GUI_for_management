import pandas as pd
import numpy as np
from datetime import datetime
import re

def process_debtor_data(file_path, specific_result_codes=None):
    """
    Process debtor data from Excel file and create report dataframe
    
    Parameters:
    file_path (str): Path to the Excel file
    specific_result_codes (list): List of specific result codes to filter (optional)
    
    Returns:
    pandas.DataFrame: Processed report dataframe
    """
    
    try:
        # Read the Excel file
        df = pd.read_excel(file_path)
        
        print(f"Data loaded successfully. Shape: {df.shape}")
        print("Columns available:")
        for col in df.columns:
            print(f"  - {col}")
            
        # Create the report dataframe with required columns
        report_data = []
        
        # Define column mappings (adjust these based on your actual column names)
        contract_col = None
        result_code_col = None
        note_col = None
        date_col = None
        
        # Try to identify columns by common naming patterns
        for col in df.columns:
            if 'contract' in col.lower() or 'debtormain_newcontractnumber' in col.lower():
                contract_col = col
            elif 'resultcode' in col.lower() or 'oareport_resultcode_id' in col.lower():
                result_code_col = col
            elif 'note' in col.lower() or 'info' in col.lower() or 'oareport_debtortel_info' in col.lower():
                note_col = col
            elif 'date' in col.lower() or 'fix_date' in col.lower():
                date_col = col
                
        # If no columns found, try to find them by partial matches
        if contract_col is None:
            for col in df.columns:
                if any(keyword in col.lower() for keyword in ['contract', 'debtormain']):
                    contract_col = col
                    break
                    
        if result_code_col is None:
            for col in df.columns:
                if any(keyword in col.lower() for keyword in ['resultcode', 'oareport_resultcode_id', 'code']):
                    result_code_col = col
                    break
                    
        if note_col is None:
            for col in df.columns:
                if any(keyword in col.lower() for keyword in ['note', 'info', 'oareport_debtortel_info']):
                    note_col = col
                    break
                    
        if date_col is None:
            for col in df.columns:
                if any(keyword in col.lower() for keyword in ['date', 'fix_date', 'report_date']):
                    date_col = col
                    break
        
        # Validate that we have all required columns
        required_cols = [contract_col, result_code_col, note_col, date_col]
        if None in required_cols:
            print("Warning: Some columns not found by pattern matching. Using first 4 columns as fallback.")
            # Fallback to first 4 columns
            cols = df.columns[:4] if len(df.columns) >= 4 else df.columns
            contract_col, result_code_col, note_col, date_col = cols[0], cols[1], cols[2], cols[3]
        
        print(f"Using columns:")
        print(f"  Contract: {contract_col}")
        print(f"  Result Code: {result_code_col}")
        print(f"  Note: {note_col}")
        print(f"  Date: {date_col}")
        
        # Process each row
        for index, row in df.iterrows():
            try:
                contract_number = str(row[contract_col]) if pd.notna(row[contract_col]) else ''
                result_code = str(row[result_code_col]) if pd.notna(row[result_code_col]) else ''
                note = str(row[note_col]) if pd.notna(row[note_col]) else ''
                report_date = row[date_col] if pd.notna(row[date_col]) else ''
                
                # Convert date to string format if it's a datetime object
                if isinstance(report_date, (datetime, pd.Timestamp)):
                    report_date = report_date.strftime('%Y-%m-%d')
                elif pd.isna(report_date):
                    report_date = ''
                
                # Filter by specific result codes if provided
                if specific_result_codes is not None and result_code not in specific_result_codes:
                    continue
                    
                # Add to report data
                report_data.append({
                    'account_code': contract_number,
                    'result_code': result_code,
                    'report_date': report_date,
                    'note': note
                })
                
            except Exception as e:
                print(f"Error processing row {index}: {str(e)}")
                continue
        
        # Create the final dataframe
        if report_data:
            report_df = pd.DataFrame(report_data)
            
            # Remove rows with empty result codes or contract numbers (optional)
            report_df = report_df[report_df['result_code'].notna() & (report_df['result_code'] != '')]
            
            print(f"\nReport created successfully. Total records: {len(report_df)}")
            print("\nFirst 5 records:")
            print(report_df.head())
            
            return report_df
        else:
            print("No data found matching criteria.")
            return pd.DataFrame()
            
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
        return pd.DataFrame()
    except Exception as e:
        print(f"Error processing file: {str(e)}")
        return pd.DataFrame()

def save_report_to_excel(report_df, output_file, sheet_name='report_case'):
    """
    Save the report dataframe to Excel file
    
    Parameters:
    report_df (pandas.DataFrame): DataFrame to save
    output_file (str): Output Excel file path
    sheet_name (str): Name of the worksheet
    """
    
    try:
        with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
            report_df.to_excel(writer, sheet_name=sheet_name, index=False)
        
        print(f"Report saved successfully to '{output_file}' with sheet name '{sheet_name}'")
        print(f"Total records saved: {len(report_df)}")
        
    except Exception as e:
        print(f"Error saving Excel file: {str(e)}")

def create_sample_excel(file_path):
    """
    Create a sample Excel file for testing purposes
    """
    
    # Sample data
    sample_data = {
        'debtormain_newcontractnumber': ['CON001', 'CON002', 'CON003', 'CON004', 'CON005'],
        'oareport_resultcode_id': [6, 12, 6, 15, 12],
        'oareport_debtortel_info': [
            'Customer not available',
            'Wrong number',
            'Customer busy',
            'No answer',
            'Wrong number'
        ],
        'fix_date': ['2023-01-15', '2023-01-16', '2023-01-17', '2023-01-18', '2023-01-19']
    }
    
    df = pd.DataFrame(sample_data)
    
    try:
        df.to_excel(file_path, index=False)
        print(f"Sample Excel file created: {file_path}")
        return True
    except Exception as e:
        print(f"Error creating sample file: {str(e)}")
        return False

# Main execution function
def main(input_file, output_file, specific_codes=None):
    """
    Main function to demonstrate the usage
    """
    
    # File paths
    # Create sample data if needed (uncomment to create sample)
    # create_sample_excel(input_file)
    
    # Define specific result codes to filter (optional)
    # Set to None to include all codes, or specify a list like [6, 12, 15]
    specific_codes = [6, 12]  # Example: only show codes 6 and 12
    
    print("Processing debtor data...")
    
    # Process the data
    report_df = process_debtor_data(input_file, specific_result_codes=specific_codes)
    
    if not report_df.empty:
        print("\n" + "="*50)
        print("REPORT SUMMARY")
        print("="*50)
        print(f"Total records: {len(report_df)}")
        print(f"Unique result codes: {report_df['result_code'].nunique()}")
        print("\nResult code distribution:")
        print(report_df['result_code'].value_counts())
        
        # Save to Excel
        save_report_to_excel(report_df, output_file, 'report_case')
        
        # Show sample of the report
        print("\n" + "="*50)
        print("SAMPLE REPORT DATA")
        print("="*50)
        print(report_df.head(10))
    else:
        print("No data to process or error occurred.")

# Alternative function for more flexible column handling
def process_debtor_data_flexible(file_path, contract_col=None, result_code_col=None, 
                               note_col=None, date_col=None, specific_result_codes=None):
    """
    Process debtor data with explicit column specification
    
    Parameters:
    file_path (str): Path to the Excel file
    contract_col (str): Name of contract number column
    result_code_col (str): Name of result code column  
    note_col (str): Name of note column
    date_col (str): Name of date column
    specific_result_codes (list): List of specific result codes to filter
    
    Returns:
    pandas.DataFrame: Processed report dataframe
    """
    
    try:
        # Read the Excel file
        df = pd.read_excel(file_path)
        
        print(f"Data loaded successfully. Shape: {df.shape}")
        
        # Use specified columns or fallback to default logic
        if contract_col is None:
            contract_col = 'debtormain_newcontractnumber'
        if result_code_col is None:
            result_code_col = 'oareport_resultcode_id' 
        if note_col is None:
            note_col = 'oareport_debtortel_info'
        if date_col is None:
            date_col = 'fix_date'
            
        # Create report dataframe
        report_data = []
        
        for index, row in df.iterrows():
            try:
                contract_number = str(row[contract_col]) if pd.notna(row[contract_col]) else ''
                result_code = str(row[result_code_col]) if pd.notna(row[result_code_col]) else ''
                note = str(row[note_col]) if pd.notna(row[note_col]) else ''
                report_date = row[date_col] if pd.notna(row[date_col]) else ''
                
                # Convert date to string
                if isinstance(report_date, (datetime, pd.Timestamp)):
                    report_date = report_date.strftime('%Y-%m-%d')
                elif pd.isna(report_date):
                    report_date = ''
                
                # Filter by specific result codes if provided
                if specific_result_codes is not None and result_code not in specific_result_codes:
                    continue
                    
                report_data.append({
                    'account_code': contract_number,
                    'result_code': result_code,
                    'report_date': report_date,
                    'note': note
                })
                
            except Exception as e:
                print(f"Error processing row {index}: {str(e)}")
                continue
        
        # Create final dataframe
        if report_data:
            report_df = pd.DataFrame(report_data)
            return report_df
        else:
            print("No valid data found.")
            return pd.DataFrame()
            
    except Exception as e:
        print(f"Error: {str(e)}")
        return pd.DataFrame()

# Example usage function
def example_usage():
    """
    Example of how to use the functions
    """
    
    # Method 1: Auto-detect columns (recommended)
    print("Method 1: Auto-detect columns")
    report_df = process_debtor_data('your_file.xlsx', specific_result_codes=[6, 12])
    
    if not report_df.empty:
        save_report_to_excel(report_df, 'output_report.xlsx')
    
    # Method 2: Specify columns explicitly
    print("\nMethod 2: Explicit column specification")
    report_df2 = process_debtor_data_flexible(
        file_path='your_file.xlsx',
        contract_col='debtormain_newcontractnumber',
        result_code_col='oareport_resultcode_id',
        note_col='oareport_debtortel_info',
        date_col='fix_date',
        specific_result_codes=[6, 12]
    )
    
    if not report_df2.empty:
        save_report_to_excel(report_df2, 'output_report_explicit.xlsx')

if __name__ == "__main__":
    
    today = datetime.now()
    formatted_date = today.strftime('%y%m%d')
    
    # Run the main function
    input_file = r"C:\reports\Phone_report\Phone_report_2025-07-07_bi.xlsx"  # Change this to your actual Excel file path
    output_file = f"C:\reports\Phone_report\output_report_explicit_{formatted_date}.xlsx"  # Change this to your desired output file path
    specific_codes = ["IMP","BKR","DCD"]  # Change this to your desired result codes
    
    main(input_file, output_file, specific_codes)
    
    # Uncomment to run example usage
    # example_usage()
