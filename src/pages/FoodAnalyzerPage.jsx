import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Sparkles, Utensils, ChefHat, Scale } from 'lucide-react';
import { BACKEND_URL } from '../config';

export default function FoodAnalyzerPage() {
  // Multi-step food analysis state
  const [step, setStep] = useState(1);
  const [foodName, setFoodName] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [productInfo, setProductInfo] = useState(null);
  const [portionSize, setPortionSize] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Custom recipe mode state
  const [isCustomRecipe, setIsCustomRecipe] = useState(false);
  const [customIngredients, setCustomIngredients] = useState([{ name: '', amount: '', unit: 'g' }]);
  const [recipeName, setRecipeName] = useState('');
  
  // Healthier alternative state
  const [showHealthier, setShowHealthier] = useState(false);
  const [healthierData, setHealthierData] = useState(null);
  const [healthierLoading, setHealthierLoading] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('ya_client_token');
    localStorage.removeItem('userId');
    window.location.href = '/login';
  };

  // Add ingredient to custom recipe
  const addCustomIngredient = () => {
    setCustomIngredients([...customIngredients, { name: '', amount: '', unit: 'g' }]);
  };

  // Remove ingredient from custom recipe
  const removeCustomIngredient = (index) => {
    if (customIngredients.length > 1) {
      setCustomIngredients(customIngredients.filter((_, i) => i !== index));
    }
  };

  // Update custom ingredient
  const updateCustomIngredient = (index, field, value) => {
    const updated = [...customIngredients];
    updated[index][field] = value;
    setCustomIngredients(updated);
  };

  // Analyze custom recipe
  const analyzeCustomRecipe = async () => {
    const validIngredients = customIngredients.filter(i => i.name.trim() && i.amount);
    if (validIngredients.length === 0) return;
    
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze-custom-recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          recipeName: recipeName.trim() || 'Custom Recipe',
          ingredients: validIngredients 
        }),
      });
      const data = await response.json();
      
      if (data.error) {
        setResult({ error: data.error });
      } else {
        setResult(data);
        setFoodName(recipeName.trim() || 'Custom Recipe');
        setIngredients(validIngredients);
        setStep(4);
      }
    } catch (error) {
      setResult({ error: 'Failed to analyze recipe. Make sure the server is running.' });
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Analyze food name and get product info + ingredients
  const analyzeFoodName = async () => {
    if (!foodName.trim()) return;
    
    setLoading(true);
    setResult(null);
    setProductInfo(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze-ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodName: foodName.trim() }),
      });
      const data = await response.json();
      
      if (data.error) {
        setResult({ error: data.error });
      } else {
        setIngredients(data.ingredients || []);
        setProductInfo({
          isBranded: data.isBranded,
          brandName: data.brandName,
          productType: data.productType,
          unit: data.unit || 'g',
          standardServing: data.standardServing || 100,
          servingDescription: data.servingDescription
        });
        setPortionSize(data.standardServing?.toString() || '100');
        setStep(2);
      }
    } catch (error) {
      setResult({ error: 'Failed to analyze food. Make sure the server is running.' });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm and proceed to portion size
  const confirmIngredients = () => {
    setStep(3);
  };

  // Skip portion customization and use standard serving
  const useStandardServing = async () => {
    await getNutritionWithPortion(productInfo?.standardServing || 100, productInfo?.unit || 'g');
  };

  // Step 3: Get full nutrition with custom portion size
  const getNutrition = async () => {
    if (!portionSize || isNaN(portionSize)) return;
    await getNutritionWithPortion(parseInt(portionSize), productInfo?.unit || 'g');
  };

  // Actual nutrition fetch
  const getNutritionWithPortion = async (portion, unit) => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/analyze-nutrition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          foodName: foodName.trim(),
          ingredients,
          portionSize: portion,
          unit: unit,
          isBranded: productInfo?.isBranded,
          userId: '1'
        }),
      });
      const data = await response.json();
      if (data.error) {
        setResult({ error: data.error });
      } else {
        setResult(data);
        setStep(4);
      }
    } catch (error) {
      setResult({ error: 'Failed to get nutrition info.' });
    } finally {
      setLoading(false);
    }
  };

  // Get healthier alternative
  const getHealthierAlternative = async () => {
    setHealthierLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/healthier-alternative`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ foodName, ingredients }),
      });
      const data = await response.json();
      setHealthierData(data);
      setShowHealthier(true);
    } catch (error) {
      setHealthierData({ error: 'Failed to get healthier alternative' });
      setShowHealthier(true);
    } finally {
      setHealthierLoading(false);
    }
  };

  // Reset and start over
  const resetAnalysis = () => {
    setStep(1);
    setFoodName('');
    setIngredients([]);
    setPortionSize('');
    setProductInfo(null);
    setResult(null);
    setShowHealthier(false);
    setHealthierData(null);
    setIsCustomRecipe(false);
    setCustomIngredients([{ name: '', amount: '', unit: 'g' }]);
    setRecipeName('');
  };

  return (
    <div className="app-container">
      <Sidebar />
      
      <main className="main-content">
        <div className="page-header-with-badge">
          <div>
            <h2>
              <Utensils className="header-icon" size={28} />
              Food Analyzer
            </h2>
            <p className="subtitle">Get detailed nutrition info powered by Llama 3.3 AI</p>
          </div>
          <div className="ai-model-badge">
            <Sparkles size={14} />
            <span>Llama 3.3 70B (Groq)</span>
          </div>
        </div>
        
        <div className="analyzer-container">
          <div className="ai-card food-analyzer-full">
            {/* Progress indicator */}
            <div className="step-indicator">
              <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                <span>1</span>
                <p>Enter Food</p>
              </div>
              <div className="step-line"></div>
              <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                <span>2</span>
                <p>Ingredients</p>
              </div>
              <div className="step-line"></div>
              <div className={`step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>
                <span>3</span>
                <p>Portion Size</p>
              </div>
              <div className="step-line"></div>
              <div className={`step ${step >= 4 ? 'active' : ''}`}>
                <span>4</span>
                <p>Results</p>
              </div>
            </div>

            {/* Step 1: Enter food name or custom recipe */}
            {step === 1 && (
              <div className="step-content">
                {/* Mode toggle */}
                <div className="mode-toggle">
                  <button 
                    className={`mode-btn ${!isCustomRecipe ? 'active' : ''}`}
                    onClick={() => setIsCustomRecipe(false)}
                  >
                    <Utensils size={16} />
                    Search Food
                  </button>
                  <button 
                    className={`mode-btn ${isCustomRecipe ? 'active' : ''}`}
                    onClick={() => setIsCustomRecipe(true)}
                  >
                    <ChefHat size={16} />
                    Custom Recipe
                  </button>
                </div>

                {/* Search Food Mode */}
                {!isCustomRecipe && (
                  <>
                    <label>What did you eat or drink?</label>
                    <input
                      type="text"
                      value={foodName}
                      onChange={(e) => setFoodName(e.target.value)}
                      placeholder="e.g., Frooti, McD Aloo Tikki Burger, Balaji Chataka Pataka, Biryani"
                      className="food-input"
                      onKeyPress={(e) => e.key === 'Enter' && analyzeFoodName()}
                    />
                    <p className="hint">Works with branded products, fast food, packaged snacks, beverages, and homemade food</p>
                    <button 
                      onClick={analyzeFoodName} 
                      disabled={!foodName.trim() || loading}
                      className="analyze-btn"
                    >
                      {loading ? 'Analyzing product...' : 'Analyze'}
                    </button>
                  </>
                )}

                {/* Custom Recipe Mode */}
                {isCustomRecipe && (
                  <>
                    <label>Recipe Name (optional)</label>
                    <input
                      type="text"
                      value={recipeName}
                      onChange={(e) => setRecipeName(e.target.value)}
                      placeholder="e.g., My Special Pasta, Homemade Dal"
                      className="food-input recipe-name-input"
                    />
                    
                    <label style={{marginTop: '16px'}}>Add your ingredients:</label>
                    <div className="custom-ingredients-list">
                      {customIngredients.map((ing, idx) => (
                        <div key={idx} className="custom-ingredient-row">
                          <input
                            type="text"
                            value={ing.name}
                            onChange={(e) => updateCustomIngredient(idx, 'name', e.target.value)}
                            placeholder="Ingredient (e.g., Rice, Paneer, Oil)"
                            className="ing-name-input"
                          />
                          <input
                            type="number"
                            value={ing.amount}
                            onChange={(e) => updateCustomIngredient(idx, 'amount', e.target.value)}
                            placeholder="Amount"
                            className="ing-amount-input"
                            min="1"
                          />
                          <select
                            value={ing.unit}
                            onChange={(e) => updateCustomIngredient(idx, 'unit', e.target.value)}
                            className="ing-unit-select"
                          >
                            <option value="g">g</option>
                            <option value="ml">ml</option>
                            <option value="cup">cup</option>
                            <option value="tbsp">tbsp</option>
                            <option value="tsp">tsp</option>
                            <option value="piece">piece</option>
                            <option value="slice">slice</option>
                          </select>
                          <button 
                            onClick={() => removeCustomIngredient(idx)}
                            className="remove-ing-btn"
                            disabled={customIngredients.length === 1}
                            title="Remove ingredient"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <button onClick={addCustomIngredient} className="add-ing-btn">
                      + Add Another Ingredient
                    </button>
                    
                    <p className="hint">Add all ingredients you used. AI will estimate total nutrition based on amounts.</p>
                    
                    <button 
                      onClick={analyzeCustomRecipe} 
                      disabled={customIngredients.filter(i => i.name.trim() && i.amount).length === 0 || loading}
                      className="analyze-btn"
                    >
                      {loading ? 'AI is calculating...' : 'Get Nutrition'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Step 2: Show detailed ingredients + product info */}
            {step === 2 && (
              <div className="step-content">
                {productInfo?.isBranded && (
                  <div className="product-badge">
                    <span className="badge-text">Branded Product</span>
                    {productInfo.productType && (
                      <span className="badge-type">{productInfo.productType}</span>
                    )}
                  </div>
                )}
                
                <h4>{productInfo?.isBranded ? 'Product Details' : 'Ingredients'} - "{foodName}"</h4>
                
                {productInfo?.servingDescription && (
                  <div className="serving-info">
                    <span>Standard serving: </span>
                    <strong>{productInfo.servingDescription}</strong>
                  </div>
                )}
                
                <div className="ingredients-detailed">
                  {ingredients.map((ing, idx) => (
                    <div key={idx} className={`ingredient-item ${typeof ing === 'object' ? ing.category : ''}`}>
                      <span className="ing-name">{typeof ing === 'object' ? ing.name : ing}</span>
                      {typeof ing === 'object' && ing.amount && (
                        <span className="ing-amount">{ing.amount}</span>
                      )}
                      {typeof ing === 'object' && ing.category && (
                        <span className={`ing-category ${ing.category}`}>{ing.category}</span>
                      )}
                    </div>
                  ))}
                </div>
                
                <p className="hint">
                  {productInfo?.isBranded 
                    ? 'Using actual product nutrition data' 
                    : 'Includes hidden items like oil, salt, preservatives'}
                </p>
                
                <div className="btn-group">
                  <button onClick={() => setStep(1)} className="back-btn">Back</button>
                  <button onClick={confirmIngredients} className="analyze-btn">Continue</button>
                </div>
              </div>
            )}

            {/* Step 3: Portion size */}
            {step === 3 && (
              <div className="step-content">
                <h4>Portion Size</h4>
                <p className="food-name-display">{foodName}</p>
                
                {productInfo?.servingDescription && (
                  <div className="standard-serving-option">
                    <p>Use standard serving:</p>
                    <button 
                      onClick={useStandardServing} 
                      disabled={loading}
                      className="standard-btn"
                    >
                      {loading ? 'Calculating...' : `${productInfo.servingDescription}`}
                    </button>
                    <p className="or-divider">— OR enter custom amount —</p>
                  </div>
                )}
                
                <div className="portion-input-group">
                  <input
                    type="number"
                    value={portionSize}
                    onChange={(e) => setPortionSize(e.target.value)}
                    placeholder="Enter amount"
                    className="portion-input"
                    min="1"
                    onKeyPress={(e) => e.key === 'Enter' && getNutrition()}
                  />
                  <span className="unit">{productInfo?.unit || 'g'}</span>
                </div>
                
                <p className="hint">
                  {productInfo?.unit === 'ml' 
                    ? 'Common sizes: 150ml (small), 200ml (regular), 330ml (can), 500ml (bottle)'
                    : 'Tip: 1 burger is about 180-200g, 1 packet chips is about 50-55g'}
                </p>
                
                <div className="btn-group">
                  <button onClick={() => setStep(2)} className="back-btn">Back</button>
                  <button 
                    onClick={getNutrition} 
                    disabled={!portionSize || loading}
                    className="analyze-btn"
                  >
                    {loading ? 'Calculating...' : 'Get Nutrition'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Show results */}
            {step === 4 && result && !result.error && (
              <div className="step-content">
                <div className="nutrition-result">
                  <h4>{result.foodName || foodName}</h4>
                  <p className="portion-info">
                    Portion: {result.portionSize || portionSize}{result.unit || productInfo?.unit || 'g'}
                    {productInfo?.isBranded && <span className="branded-tag">Branded Product</span>}
                    {result.aiModel && <span className="ai-tag">🤖 {result.aiModel}</span>}
                  </p>
                  
                  <div className="main-nutrients">
                    <div className="nutrient-card calories">
                      <span className="nutrient-value">{result.nutrition?.calories ?? 'N/A'} <small>kcal</small></span>
                      <span className="nutrient-label">Calories</span>
                    </div>
                    <div className="nutrient-card protein">
                      <span className="nutrient-value">{result.nutrition?.protein ?? 'N/A'}<small>g</small></span>
                      <span className="nutrient-label">Protein</span>
                    </div>
                    <div className="nutrient-card carbs">
                      <span className="nutrient-value">{result.nutrition?.carbohydrates ?? 'N/A'}<small>g</small></span>
                      <span className="nutrient-label">Carbs</span>
                    </div>
                    <div className="nutrient-card fat">
                      <span className="nutrient-value">{result.nutrition?.fat ?? 'N/A'}<small>g</small></span>
                      <span className="nutrient-label">Fat</span>
                    </div>
                  </div>

                  <div className="other-nutrients">
                    <div className="nutrient-row">
                      <span>Sodium</span>
                      <span>{result.nutrition?.sodium ?? 'N/A'} mg</span>
                    </div>
                    <div className="nutrient-row">
                      <span>Cholesterol</span>
                      <span>{result.nutrition?.cholesterol ?? 'N/A'} mg</span>
                    </div>
                    <div className="nutrient-row">
                      <span>Fiber</span>
                      <span>{result.nutrition?.fiber ?? 'N/A'} g</span>
                    </div>
                    <div className="nutrient-row">
                      <span>Sugar</span>
                      <span>{result.nutrition?.sugar ?? 'N/A'} g</span>
                    </div>
                  </div>

                  {/* Ingredient breakdown for recipes */}
                  {result.ingredientBreakdown && result.ingredientBreakdown.length > 0 && (
                    <div className="ingredients-summary">
                      <h5>Ingredient Nutrition Breakdown</h5>
                      <div className="ingredients-detailed compact">
                        {result.ingredientBreakdown.map((ing, idx) => (
                          <div key={idx} className="ingredient-item">
                            <span className="ing-name">{ing.name}</span>
                            <span className="ing-stats">
                              {ing.calories}cal | {ing.protein}g P | {ing.carbs}g C | {ing.fat}g F
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Standard ingredients list */}
                  {ingredients.length > 0 && !result.ingredientBreakdown && (
                    <div className="ingredients-summary">
                      <h5>Ingredients</h5>
                      <div className="ingredients-detailed compact">
                        {ingredients.map((ing, idx) => (
                          <div key={idx} className={`ingredient-item ${typeof ing === 'object' ? ing.category : ''}`}>
                            <span className="ing-name">{typeof ing === 'object' ? ing.name : ing}</span>
                            {typeof ing === 'object' && ing.amount && (
                              <span className="ing-amount">{ing.amount}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.recommendation && (
                    <div className="recommendation llama-insight">
                      <h5>
                        <Sparkles size={16} className="llama-sparkle" />
                        Llama AI Insight
                      </h5>
                      <p>{result.recommendation}</p>
                    </div>
                  )}

                  {!showHealthier && (
                    <button 
                      onClick={getHealthierAlternative} 
                      disabled={healthierLoading}
                      className="healthier-btn"
                    >
                      {healthierLoading ? 'Finding healthier options...' : 'Show Healthier Alternative'}
                    </button>
                  )}

                  {showHealthier && healthierData && !healthierData.error && (
                    <div className="healthier-section">
                      <h4>{healthierData.title || `Healthier ${foodName}`}</h4>
                      
                      {healthierData.calorieReduction && (
                        <p className="calorie-savings">
                          Potential calorie reduction: <strong>{healthierData.calorieReduction}</strong>
                        </p>
                      )}

                      {healthierData.changes && healthierData.changes.length > 0 && (
                        <div className="changes-list">
                          <h5>Ingredient Swaps</h5>
                          {healthierData.changes.map((change, idx) => (
                            <div key={idx} className="change-item">
                              <div className="change-swap">
                                <span className="original">{change.original}</span>
                                <span className="arrow">to</span>
                                <span className="replacement">{change.replacement}</span>
                              </div>
                              {change.benefit && (
                                <p className="change-benefit">{change.benefit}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {healthierData.cookingTips && healthierData.cookingTips.length > 0 && (
                        <div className="cooking-tips">
                          <h5>Cooking Tips</h5>
                          <ul>
                            {healthierData.cookingTips.map((tip, idx) => (
                              <li key={idx}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {healthierData.healthBenefits && (
                        <div className="health-benefits">
                          <h5>Health Benefits</h5>
                          <p>{healthierData.healthBenefits}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {showHealthier && healthierData?.error && (
                    <div className="error-box small">{healthierData.error}</div>
                  )}
                </div>
                
                <button onClick={resetAnalysis} className="analyze-btn" style={{marginTop: '24px'}}>
                  Analyze Another Food
                </button>
              </div>
            )}

            {result?.error && (
              <div className="error-box">
                {result.error}
                <button onClick={resetAnalysis} className="retry-btn">Try Again</button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
